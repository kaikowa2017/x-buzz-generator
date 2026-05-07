import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/claude";
import { prisma } from "@/lib/prisma";

const AUTOFIX_SYSTEM = `あなたはX投稿の自動チューニングエンジンです。
7つのチェックを順に適用し、最小限の変更で投稿を改善します。

## チューニング処理（順番に適用）

① フック強化
・1行目が35文字超、または引きが弱い → 短く・意外性あるものに書き直す
・スクロールが止まる表現を優先（短い疑問・意外な事実・ターゲティング）

② 説明削除
・「つまり」「まとめると」「ということです」→ 削除し余白を残す
・結論を言い切っている → 含みを持たせる・ぼかす

③ 人間らしさ調整
・完璧すぎる文章 → 「なんか」「ちょっと」「かもしれない」を1〜2個自然に混ぜる
・言い切りで終わる → 余白・問い・含みで終わるよう調整

④ 違和感調整
・「でも」「実は」「意外と」が3回以上 → 1〜2回に削減
・1回もない → 自然な流れで1つ追加

⑤ コメント誘発
・答えが1つに決まる構造 → 複数解釈できる曖昧な終わり方に変更
・「あなたはどう思う？」型の直接問いは避ける。自然な余白で誘発する

⑥ 無駄削除
・重複表現・余分な接続詞・不要な修飾語を削除

## 絶対ルール
- 元の意図・ジャンルを保つ
- 変更量は全体の20〜30%以内
- 280文字以内を厳守
- 問題ない箇所は変えない
- テクニック感・作られた感を増やさない`;

type RequestBody = {
  content:           string;
  postType?:         string;
  accountId?:        string;
  aggressiveMode?:   boolean;
  commentabilityFix?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as RequestBody;
    const { content, postType, accountId, aggressiveMode, commentabilityFix } = body;

    if (!content) return NextResponse.json({ error: "content は必須" }, { status: 400 });

    // ⑥ 類似回避用: 直近5投稿の冒頭を取得
    let recentSnippets: string[] = [];
    if (accountId) {
      try {
        const recent = await prisma.post.findMany({
          where:   { accountId },
          orderBy: { createdAt: "desc" },
          take:    5,
          select:  { content: true },
        });
        recentSnippets = recent.map((p) => p.content.split("\n")[0]?.slice(0, 50) ?? "");
      } catch { /* DB未接続時はスキップ */ }
    }

    const similarSection = recentSnippets.length > 0
      ? [
          "",
          "⑥ 類似回避（直近投稿の冒頭）",
          ...recentSnippets.map((s, i) => `${i + 1}. ${s}`),
          "↑ これらと類似した書き出し・構造なら変更すること",
        ].join("\n")
      : "";

    const aggressiveSection = aggressiveMode
      ? "\n【重要】前回のチューニングで改善が不十分でした。より積極的に修正してください:\n・フックを完全に書き直してOK\n・説明的な部分は大きく削除してOK\n・崩し度合いを強めてOK\n・最終的に「人が書いた感」が強く出るようにする\n"
      : "";

    const commentabilitySection = commentabilityFix
      ? `
【コメント誘発修正】コメント誘発スコアが低いため、以下を適用してください:
・結論を言い切らない — 「〜かもしれない」「〜な気もする」で終わらせる
・複数解釈を残す — AともBとも読める曖昧さを意図的に入れる
・読者によって「わかる/わからない」「賛成/反対」に分かれる要素を1つ入れる
・直接的な問いかけ（「あなたはどう思う？」等）は禁止 — 余白で自然に誘発する
・断定した文があれば、疑問や揺らぎに書き換える
`
      : "";

    const userPrompt = [
      `投稿文:`,
      content,
      `投稿タイプ: ${postType ?? "不明"}`,
      aggressiveSection,
      commentabilitySection,
      similarSection,
      ``,
      `上記のチューニングを適用し、以下のJSONのみを返してください（コードブロック・説明不要）:`,
      `{`,
      `  "fixedContent": "修正後の投稿文（変更なしなら元の文をそのまま）",`,
      `  "changeNote": "主な変更点を1行で。例: フック短縮・説明削除・疑問で締め",`,
      `  "applied": ["フック強化", "説明削除"]`,
      `}`,
    ].filter(Boolean).join("\n");

    const anthropic = await getAnthropicClient();
    const response  = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 700,
      system: [{ type: "text", text: AUTOFIX_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({
        fixedContent: content,
        changeNote:   "チューニング結果を取得できませんでした",
        applied:      [],
        changed:      false,
      });
    }

    const parsed = JSON.parse(match[0]) as {
      fixedContent?: string;
      changeNote?:   string;
      applied?:      string[];
    };

    const fixedContent = parsed.fixedContent?.trim() ?? content;
    return NextResponse.json({
      fixedContent,
      changeNote: parsed.changeNote ?? "変更なし",
      applied:    parsed.applied ?? [],
      changed:    fixedContent !== content.trim(),
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "チューニング中にエラー";
    console.error("[/api/generate/autofix]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
