import { NextResponse } from "next/server";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "@/lib/claude";
import { analyzeBuzzUrl } from "@/lib/buzz-fetcher";
import { checkBudget, addUsage } from "@/lib/budget";

export const PATTERNS = [
  "疑問フック",
  "数字リスト",
  "実話・体験談",
  "情報ギャップ",
  "反論・逆張り",
  "データ・統計",
  "比較・対比",
  "感情訴求",
  "即時価値",
  "ストーリー展開",
] as const;

export type Pattern = (typeof PATTERNS)[number];

export const DeepAnalysisSchema = z.object({
  genre: z.string().describe(
    "推定ジャンル（例: horror / business / lifestyle / knowledge / tech / health / entertainment）"
  ),
  pattern: z.enum(PATTERNS).describe("10種のパターンのうち最も当てはまるもの"),
  hookStrength: z.enum(["強い", "普通", "弱い"]).describe(
    "フックの強度。最初の1〜2文がどれだけ読者を止められるか"
  ),
  contemplation: z.enum(["高", "中", "低"]).describe(
    "考察性。読者が自分の意見を持ちたくなる度合い"
  ),
  commentInduction: z.enum(["高", "中", "低"]).describe(
    "コメント誘発度。賛否・体験談・質問が自然に湧く構造か"
  ),
  whyViral: z.string().describe("なぜ伸びたか（1〜2行、具体的な構造的理由）"),
  reproductionTemplate: z
    .tuple([z.string(), z.string(), z.string(), z.string()])
    .describe(
      "4ステップ再現テンプレ: [0]フック文の構造, [1]本題の提示方法, [2]根拠・証拠の示し方, [3]締め・CTAの構造"
    ),
  adaptedPost: z.string().describe(
    "指定されたジャンルに変換した投稿案（280文字以内の日本語）"
  ),
});

export type DeepAnalysis = z.infer<typeof DeepAnalysisSchema>;

const SYSTEM_PROMPT = `あなたはX(Twitter)バイラルコンテンツの構造分析専門家です。
バズ投稿を分析して、その成功要因を構造的に解明し、再現可能なテンプレートに変換します。

## 分析対象の10パターン

1. 疑問フック — 「なぜ〜？」「〜したことある？」など疑問から始まる
2. 数字リスト — 「〇個の〜」「TOP〇〇」など数字で構成する
3. 実話・体験談 — 実際の体験・失敗・成功を語る
4. 情報ギャップ — 「実は〜」「知らなかった人は損してる」など意外性で引く
5. 反論・逆張り — 一般的な意見・常識に真っ向から反論する
6. データ・統計 — 調査結果・数字・比率を使って信頼性を担保する
7. 比較・対比 — AとBを並べて差を視覚的に見せる
8. 感情訴求 — 怒り・共感・感動・悲しみなど感情に直接訴える
9. 即時価値 — 今すぐ使えるノウハウ・手順・Tips
10. ストーリー展開 — 物語形式で読者を引き込む（起承転結）

## フック強度の基準
- 強い: 最初の1〜2文で確実に読者を止める。数字・衝撃・疑問・感情のどれかが明確
- 普通: 興味を引くが決定打に欠ける。読者によって反応が分かれる
- 弱い: フックが曖昧でタイムラインに流れてしまう

## 考察性の基準
- 高: 読者が「自分ならどうか」「本当にそうか？」と考えさせられ、意見を持ちたくなる
- 中: 参考になるが深く考えるほどではない
- 低: 情報として受け取るだけで思考を促さない

## コメント誘発度の基準
- 高: 賛否・共感・反論・体験談・質問のどれかが自然に湧く構造になっている
- 中: コメントしたくなる場合もある
- 低: 読むだけで完結する。コメントの動機が生まれにくい

## 再現テンプレの形式
必ず4要素で構成し、各要素は「構造の説明（実例ではなく型）」で記述:
[0] フック文の構造（例:「〇〇な人が見落としがちな△△」）
[1] 本題の提示方法（例:「箇条書きで3つの事実を提示」）
[2] 根拠・証拠の示し方（例:「実際の経験談で信頼性を担保」）
[3] 締め・CTAの構造（例:「問いかけで読者を主役にする」）

## 変換案の注意
- 分析対象の構造・パターンを維持しながら、指定ジャンルの語彙・事例に置き換える
- 280文字以内
- オリジナルのコピーにならないようにする`;

export async function POST(req: Request) {
  const body = await req.json();
  const { url, content: rawContent, genre, accountId } = body as {
    url?: string;
    content?: string;
    genre?: string;
    accountId?: string;
  };

  if (!url && !rawContent) {
    return NextResponse.json({ error: "url または content は必須" }, { status: 400 });
  }

  // 予算チェック
  const budgetCheck = await checkBudget();
  if (!budgetCheck.ok) {
    return NextResponse.json({ error: budgetCheck.message, overBudget: true }, { status: 429 });
  }

  // URLの場合はコンテンツを取得
  let content = rawContent ?? "";
  let fetchedUrl = url;
  if (url && !rawContent) {
    const fetched = await analyzeBuzzUrl(url);
    content = fetched.content;
    if (!content || content.includes("取得できませんでした")) {
      return NextResponse.json(
        { error: "URLからコンテンツを取得できませんでした。テキストを直接貼り付けてください。" },
        { status: 422 }
      );
    }
  }

  const userContent = [
    `【分析対象の投稿】\n${content}`,
    genre ? `【自分のジャンル】${genre}` : "【自分のジャンル】不明（汎用的な投稿案を作成）",
  ].join("\n\n");

  const anthropic = await getAnthropicClient();
  const response = await anthropic.messages.parse({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userContent }],
    output_config: {
      format: zodOutputFormat(DeepAnalysisSchema),
    },
  });

  if (!response.parsed_output) {
    return NextResponse.json({ error: "分析に失敗しました" }, { status: 500 });
  }

  // 使用量を加算
  const costUsd = await addUsage(response.usage.input_tokens, response.usage.output_tokens);

  return NextResponse.json({
    ...response.parsed_output,
    sourceContent: content,
    sourceUrl: fetchedUrl,
    accountId,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheRead: response.usage.cache_read_input_tokens ?? 0,
      costUsd,
      costJpy: Math.ceil(costUsd * 150),
    },
  });
}
