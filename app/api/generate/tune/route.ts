import { NextResponse } from "next/server";
import { analyzeMicro } from "@/lib/postMicroTuner";
import { getAnthropicClient } from "@/lib/claude";

const TUNE_SYSTEM = `あなたはX投稿の文体微調整専門AIです。
指摘された問題点を最小限の変更で修正します。

絶対ルール:
- 元の意味・内容・ジャンルを保つ
- 変える量は全体の20〜30%以内
- 修正後も280文字以内を維持
- テンプレ感・作られた感を増やしてはいけない`;

type RequestBody = {
  content:  string;
  postType?: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as RequestBody;
    const { content, postType } = body;

    if (!content) return NextResponse.json({ error: "content は必須" }, { status: 400 });

    const analysis = analyzeMicro(content);

    let tunedContent: string | null = null;
    let seriesHint:   string | null = null;

    if (analysis.needsTune) {
      try {
        const anthropic = await getAnthropicClient();

        const issueList = analysis.issues
          .filter((i) => i.severity !== "low")
          .map((i) => `・${i.label}: ${i.detail}`)
          .join("\n");

        const userPrompt = [
          `投稿文:`,
          content,
          ``,
          `投稿タイプ: ${postType ?? "不明"}`,
          ``,
          `検出された問題:`,
          issueList,
          ``,
          `以下のJSONのみを返してください（説明・コードブロック不要）:`,
          `{`,
          `  "tunedContent": "修正後の投稿文（問題を解消した最小変更版）",`,
          `  "seriesHint": "この投稿をシリーズ化できるなら1行でヒント、できなければ null"`,
          `}`,
        ].join("\n");

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 600,
          system: [{ type: "text", text: TUNE_SYSTEM, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: userPrompt }],
        });

        const raw = response.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { type: "text"; text: string }).text)
          .join("");

        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as {
            tunedContent?: string | null;
            seriesHint?:   string | null;
          };
          if (parsed.tunedContent && parsed.tunedContent !== content) {
            tunedContent = parsed.tunedContent;
          }
          seriesHint = parsed.seriesHint ?? null;
        }
      } catch {
        // Claude 未設定時はルールベース結果のみ
      }
    }

    return NextResponse.json({
      scores:    analysis.scores,
      issues:    analysis.issues,
      overall:   analysis.overall,
      needsTune: analysis.needsTune,
      tunedContent,
      seriesHint,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "微調整チェック中にエラー";
    console.error("[/api/generate/tune]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
