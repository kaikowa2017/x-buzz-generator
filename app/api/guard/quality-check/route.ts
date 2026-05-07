import { NextResponse } from "next/server";
import { runQualityChecks } from "@/lib/postQualityChecker";
import { getAnthropicClient } from "@/lib/claude";

const QUALITY_SYSTEM = `あなたはXの投稿品質審査AIです。
投稿のリスクを分析し、必要なら修正案を提案してください。

判定基準:
- SAFE: 問題なし
- CAUTION: 改善推奨（表示はするが警告を表示）
- BLOCKED: 重大なリスクあり（修正案必須）

## 炎上リスク判定
以下が高リスク:
- 一方的な断定で批判するコンテンツ
- センシティブな政治・宗教・差別的トピック
- 誤情報の拡散につながる主張

## 修正案の方針
- 元の意図・ジャンルを保ちながら問題点を除去
- より包括的・balanced な表現に変換
- 280文字以内を維持`;

type RequestBody = {
  content:      string;
  imagePrompt?: string;
  videoPrompt?: string;
  accountId?:   string;
  postType?:    string;
  genre?:       string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as RequestBody;
    const { content, imagePrompt, videoPrompt, accountId, postType, genre } = body;

    if (!content) {
      return NextResponse.json({ error: "content は必須" }, { status: 400 });
    }

    // Step 1: ルールベースチェック（高速・常時）
    const ruleResult = await runQualityChecks({
      content, imagePrompt, videoPrompt, accountId, postType,
    });

    // safe / info のみなら Claude 不要
    if (ruleResult.overallRisk === "safe" && !ruleResult.issues.length) {
      return NextResponse.json({
        overallRisk:        "safe",
        issues:             [],
        fixedContent:       null,
        postTypeSuggestion: ruleResult.postTypeSuggestion,
        structureInsight:   ruleResult.structureInsight,
        claudeChecked:      false,
      });
    }

    // Step 2: Claude 意味論チェック + 修正案（blocked/warning 時）
    let claudeChecked = false;
    let fixedContent:  string | null = null;
    let claudeRisk:    string        = ruleResult.overallRisk;

    try {
      const anthropic = await getAnthropicClient();

      const issuesSummary = ruleResult.issues
        .map((i) => `[${i.level.toUpperCase()}] ${i.name}: ${i.detail}`)
        .join("\n");

      const userPrompt = [
        `投稿: ${content}`,
        imagePrompt ? `画像プロンプト: ${imagePrompt}` : "",
        `ジャンル: ${genre ?? "不明"} / タイプ: ${postType ?? "不明"}`,
        "",
        `検出された問題:`,
        issuesSummary,
        "",
        `上記を踏まえ、以下のJSONを返してください:`,
        `{`,
        `  "riskLevel": "safe"|"caution"|"blocked",`,
        `  "inflammationRisk": "low"|"medium"|"high",`,
        `  "inflammationReason": string|null,`,
        `  "fixedContent": string|null`,
        `}`,
        `fixedContentは riskLevel が caution/blocked の場合のみ生成。問題を解消しつつ元の意図を保つこと。`,
      ].filter(Boolean).join("\n");

      const response = await anthropic.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 1024,
        system: [
          { type: "text", text: QUALITY_SYSTEM, cache_control: { type: "ephemeral" } },
        ],
        messages: [{ role: "user", content: userPrompt }],
      });

      const rawText  = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          riskLevel:          string;
          inflammationRisk?:  string;
          inflammationReason?: string | null;
          fixedContent?:      string | null;
        };

        claudeRisk   = parsed.riskLevel;
        fixedContent = parsed.fixedContent ?? null;

        // 炎上リスクが高い場合は issue を追加
        if (parsed.inflammationRisk === "high" && parsed.inflammationReason) {
          ruleResult.issues.push({
            checkId: "inflammation_risk",
            name:    "炎上リスク",
            level:   "warning",
            detail:  parsed.inflammationReason,
            hint:    "より中立的な表現に変えるか、根拠を明示してください",
          });
        }

        claudeChecked = true;
      }
    } catch {
      // Claude 未設定時はルールベース結果のみ使用
    }

    // 最終リスクレベル（ルールベース vs Claude の厳しい方）
    const riskOrder = { safe: 0, caution: 1, blocked: 2 };
    const ruleLevel  = ruleResult.overallRisk;
    const finalRisk  = (riskOrder[claudeRisk as keyof typeof riskOrder] ?? 0) >=
                       (riskOrder[ruleLevel] ?? 0)
      ? claudeRisk
      : ruleLevel;

    return NextResponse.json({
      overallRisk:        finalRisk,
      issues:             ruleResult.issues,
      fixedContent,
      postTypeSuggestion: ruleResult.postTypeSuggestion,
      structureInsight:   ruleResult.structureInsight,
      claudeChecked,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "チェック中にエラー";
    console.error("[/api/guard/quality-check]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
