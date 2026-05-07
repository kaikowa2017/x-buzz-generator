import { NextResponse } from "next/server";
import { fastCheck, type GuardResult } from "@/lib/xRulesGuard";
import { getAnthropicClient } from "@/lib/claude";

const GUARD_SYSTEM = `あなたはX(Twitter)の安全審査AIです。
投稿テキストと画像/動画プロンプトを審査し、Xの利用規約への違反リスクを判定します。

## あなたの役割
1. 初期フィルタで検出された違反候補を精査し、誤検知を排除する
2. 本当に違反のある投稿には修正版を提案する
3. ホラー・フィクション等の正当なコンテンツを不当にブロックしない

## 判定基準
- SAFE: 利用規約上の問題なし（ホラー/フィクション/批評は原則 SAFE）
- CAUTION: 表現が誤解を招く可能性があるが、修正の余地あり
- BLOCKED: 明確な利用規約違反

## エンゲージメントファーミングの判定
### BLOCKED（報酬と反応の交換）
- 「いいねしたら○○」「RTしたら○○」「フォローしたら○○」「コメントした人に○○」
- 全員リプ/コメント/DMを命令する表現
- 拡散希望の繰り返し（2回以上同一ツイート内）

### CAUTION（反応を命令・条件付き）
- 「○○な人はいいね」「○○に賛成はRT」（反応を命令する）
- 「いいねが100になったら続きを投稿」（条件付きコンテンツ）

### SAFE（自然なエンゲージメント）
- 「あなたはどう思う？」（問いかけ）
- 好奇心・共感・違和感で自然に反応が湧く構造
- 「コメント欄で教えてください」（一般的な誘いかけ）

## 修正版の生成指針
blocked時は、エンゲージメントファーミングを排除しつつ、
自然に反応したくなる構造（好奇心ギャップ/共感/答え合わせ欲求）に書き換えること。

## 重要
- 日本語のホラー投稿で「死」「血」「闇」が出てくるだけでは違反ではない
- 架空のキャラクターへの表現はフィクションとして扱う
- 具体的な脅迫・ヘイト・詐欺・EFの証拠がある場合のみ BLOCKED`;

type RequestBody = {
  content:      string;
  imagePrompt?: string;
  videoPrompt?: string;
  genre?:       string;
  postType?:    string;
  violations?:  { ruleId: string; ruleName: string; detail: string }[];
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as RequestBody;
    const { content, imagePrompt, videoPrompt, genre, postType, violations } = body;

    if (!content) {
      return NextResponse.json({ error: "content は必須です" }, { status: 400 });
    }

    // Step 1: 高速 regex チェック
    const fastResult: GuardResult = fastCheck(content, imagePrompt, videoPrompt);

    // safe の場合はここで終了（API呼び出し不要）
    if (fastResult.riskLevel === "safe") {
      return NextResponse.json({
        riskLevel:  "safe",
        violations: [],
        fixedPost:  null,
      });
    }

    // Step 2: Claude による意味論チェック + 自動修正
    let anthropic;
    try {
      anthropic = await getAnthropicClient();
    } catch {
      // APIキー未設定時は regex 結果のみ返す
      return NextResponse.json({
        riskLevel:  fastResult.riskLevel,
        violations: fastResult.violations,
        fixedPost:  null,
        note:       "Claude APIが未設定のため意味論チェックをスキップしました",
      });
    }

    const detectedViolations = violations ?? fastResult.violations;
    const violationSummary   = detectedViolations
      .map((v) => `- [${v.ruleName}] ${v.detail}`)
      .join("\n");

    const userPrompt = [
      `## 審査対象`,
      `投稿テキスト: ${content}`,
      imagePrompt ? `画像プロンプト: ${imagePrompt}` : "",
      videoPrompt ? `動画プロンプト: ${videoPrompt}` : "",
      genre     ? `ジャンル: ${genre}` : "",
      postType  ? `投稿タイプ: ${postType}` : "",
      ``,
      `## 初期フィルタの検出結果`,
      violationSummary,
      ``,
      `## タスク`,
      `上記を審査し、以下の JSON を返してください（他のテキストは不要）:`,
      `{`,
      `  "riskLevel": "safe" | "caution" | "blocked",`,
      `  "confirmedViolations": [{"ruleId": string, "reason": string}],`,
      `  "fixedPost": string | null,`,
      `  "fixNote": string | null`,
      `}`,
      ``,
      `fixedPost は riskLevel が caution または blocked の場合のみ生成。`,
      `Xルールに準拠しつつ元の意図（ジャンル: ${genre ?? "不明"}）を保った修正版を書いてください。`,
      `safe 判定の場合は fixedPost: null。`,
    ].filter(Boolean).join("\n");

    const response = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [
        {
          type:          "text",
          text:          GUARD_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    // Claude のレスポンスをパース
    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // パース失敗時は regex 結果で返す
      return NextResponse.json({
        riskLevel:  fastResult.riskLevel,
        violations: fastResult.violations,
        fixedPost:  null,
        note:       "Claude レスポンスのパースに失敗しました",
      });
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      riskLevel:            string;
      confirmedViolations?: { ruleId: string; reason: string }[];
      fixedPost?:           string | null;
      fixNote?:             string | null;
    };

    // 確認済み violations を構築
    const confirmedViolations = (parsed.confirmedViolations ?? []).map((cv) => {
      const original = fastResult.violations.find((v) => v.ruleId === cv.ruleId);
      return {
        ruleId:   cv.ruleId,
        ruleName: original?.ruleName ?? cv.ruleId,
        level:    original?.level ?? "caution",
        detail:   cv.reason,
        scope:    original?.scope ?? "text",
      };
    });

    const finalLevel = (["safe", "caution", "blocked"].includes(parsed.riskLevel)
      ? parsed.riskLevel
      : fastResult.riskLevel) as "safe" | "caution" | "blocked";

    return NextResponse.json({
      riskLevel:  finalLevel,
      violations: confirmedViolations,
      fixedPost:  parsed.fixedPost ?? null,
      fixNote:    parsed.fixNote ?? null,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "チェック中にエラーが発生しました";
    console.error("[/api/guard/check]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
