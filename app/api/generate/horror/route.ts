import { NextResponse } from "next/server";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "@/lib/claude";
import { prisma } from "@/lib/prisma";
import { checkBudget, addUsage, getBudgetStatus } from "@/lib/budget";
import { analyzeMicro, type MicroScore } from "@/lib/postMicroTuner";

/* ── スコア帯 ── */
export const HORROR_TIERS = {
  good:  80, // ≥ 80 → 即出力
  minor: 60, // 60〜79 → 改善案表示
  // < 60 → 再生成候補（ユーザー判断）
} as const;

export type HorrorTier = "good" | "minor" | "bad";
export type HorrorSuggestion = {
  type:        string;
  description: string;
  instruction: string;
};

/* ─────────────────────────────────────────────────────────────
   ホラー専用システムプロンプト
   ───────────────────────────────────────────────────────────── */
export const HORROR_SYSTEM = `あなたはXの「処理しきれない違和感ホラー」投稿専門AIです。
以下を絶対に守り、投稿を生成してください。

## 出力必須構造（5段階）
① 日常 or 体験ベースで開始（説明禁止）
② 小さい違和感（説明しない・意味を確定させない）
③ もう一段の違和感（より曖昧に）
④ 決定的な違和感（でも絶対説明しない）
⑤ 状態だけ残して終了（結論禁止・余韻のみ）

## 違和感ルール

### ① 最低2〜3個の違和感を入れる
### ② それぞれの意味を説明しない
### ③【最重要制御①】1発理解できる状態を作らない
### ④【最重要制御②】同じ原因で説明できない組み合わせにする

1つの違和感だけで読者が「ああ、そういうことか」と確信できる構造は禁止。

**禁止例**:
「物音がした。幽霊かもしれない。」← 1つで意味が確定してしまう

**必須**: 違和感の後に「状況の変化」を追加して意味を崩すこと。

状況変化パターン（いずれかを使う）:
・増えた　→ 戻っていた
・あった　→ 消えていた
・見えた　→ 記録にない
・起きた　→ なかったことになっている
・動いた　→ 動いていないはずの状態で終わる
・聞こえた → 誰も聞いていない

**目標①**: 読者が「たぶん〇〇だ」と思った瞬間にそれを崩す。
「理解できそうで確信できない状態」のまま終わること。

### 違和感の矛盾設計（④の詳細）

**禁止: 1つの原因で全ての違和感が説明できる構造**

禁止例:
「物音がした＋影が見えた＋気配がした」
← 「幽霊がいる」という1つの答えで全部説明できてしまう

**必須: 異なる種類の違和感を組み合わせる**

推奨する組み合わせパターン:
・数量 × 位置: 「増えた＋場所が変わっている」
・存在 × 時間: 「あったはずの時間に存在しない」
・感覚 × 記録: 「見えた/感じた＋記録にない」
・数量 × 感覚: 「数が合わない＋温度がおかしい」
・時間 × 存在: 「時刻が合わない＋消えていた」

**目標②**: 読者が「〇〇のせいだ」という答えに1つにたどり着けない設計にする。

## 絶対禁止
- 原因・理由を説明する
- オチ・結末を作る
- 話を完結させる
- 1つの違和感だけで終わる
- 意味が理解できる状態で終わる
- 説明口調（「〜の話」「〜だった」「つまり〜」）
- 感情の直接説明（「怖かった」「恐ろしかった」）
- 「〜の話」で始まるフック

## フック（最初の1行のみ）
許可: 体験系「病院の夜って〜」/ 違和感系「あの部屋だけ〜」

## 文章スタイル
- 短く区切る（長い1文は禁止）
- 言い切らない（「たぶん」「気のせい」「なんか」「よくわからないけど」を使う）
- 口語・崩した表現（完璧な文章は禁止）
- 改行を多用して余白と間を作る

## コメント誘発（最重要）
- 解釈が2つ以上できる構造
- 答えが1つに決まらない終わり方
- 「どういうこと？」「これ何？」が自然に生まれる
- 直接的な問いかけ禁止

## 良い例
「病院の夜って、なんか静かすぎる。
たまに廊下から音がするけど、スタッフさんだと思ってた。

でも今日、気になって確認したら。
3階から音がしてた。

3階は今月から閉鎖されてる。」

【状況変化の例】
「昨日まで確かに5冊あった。
今日数えたら4冊だった。

気のせいかと思って、また数えたら。
6冊あった。」

← 増えた→減った→増えた という変化で確信が持てない状態を作っている`;

/* ── OutputSchema ── */
const OutputSchema = z.object({
  posts: z
    .array(
      z.object({
        content:             z.string().describe("ホラー投稿文。5段階構造厳守。違和感2〜3個・結論なし・余韻で終わる。"),
        imagePrompt:         z.string().describe("ダークで不気味な画像プロンプト（英語）。"),
        videoPrompt:         z.string().describe("緊張感のある動画プロンプト（英語）。"),
        triggersApplied:     z.array(z.string()),
        triggerAim:          z.string(),
        psychLawsApplied:    z.array(z.string()),
        psychLawExplanation: z.string(),
      })
    )
    .length(3),
});

/* ── スコア検証 ── */
export function validatePost(content: string): {
  tier:         HorrorTier;
  passed:       boolean;
  scores:       MicroScore;
  overall:      number;
  failedChecks: string[];
} {
  const { scores, overall } = analyzeMicro(content);
  const failedChecks: string[] = [];

  if (scores.hookStrength   < 70) failedChecks.push(`フック ${(scores.hookStrength / 10).toFixed(1)} < 7.0`);
  if (scores.dissonance     < 50) failedChecks.push(`違和感 ${(scores.dissonance / 10).toFixed(1)} < 5.0`);
  if (scores.commentability < 50) failedChecks.push(`コメント誘発 ${(scores.commentability / 10).toFixed(1)} < 5.0`);
  if (scores.humanness      < 60) failedChecks.push(`人間らしさ ${(scores.humanness / 10).toFixed(1)} < 6.0`);

  // 定性チェック
  const explanationRe = /なぜなら|原因は|理由は|だから.*[。]/;
  if (explanationRe.test(content)) failedChecks.push("説明的な表現が含まれている");

  const conclusionRe = /だったのだ|ということだ|と分かった|結局|そういうことだ/;
  if (conclusionRe.test(content)) failedChecks.push("結論・オチを書いている");

  const dissonanceWords = ["でも","気のせい","なんか","たぶん","よくわからない","変な","不思議","なぜか","おかしい"];
  if (dissonanceWords.filter((w) => content.includes(w)).length < 2)
    failedChecks.push("違和感要素が1個以下");

  const ambiguityRe = /たぶん|気のせい|なんか|よくわからない|かもしれない|な気がする/;
  if (!ambiguityRe.test(content)) failedChecks.push("曖昧表現がない");

  const firstLine = content.split(/\n/)[0] ?? "";
  if (/の話/.test(firstLine)) failedChecks.push("フックが「〜の話」形式");

  // 違和感のドメイン多様性チェック（同じ原因で説明できない組み合わせか）
  const dissonanceDomains: Record<string, RegExp> = {
    quantity: /増え(た|てた|ていた)|減(っ|り)(た|て)|数が(合わ|おかし|変)|冊|個|枚/,
    position: /場所|位置|移(動|っ|り)(て|た)|置いた.*な|ここ.*な|部屋が/,
    time:     /時間|時刻|昨日|今日|さっき|前に(は|も)|はず(だっ|の)|タイミング/,
    sensory:  /温度|冷たい|暖か|音|匂い|声|触(っ|れ)|見え(た|てた)|気配|寒|暑/,
    existence:/消え(た|てた|ていた)|な(く|かっ)(な|た)|見当たら|あ(っ|り)た.*な/,
    record:   /記録|写真|映像|ログ|覚(え|えて)(い|な)|知らな|聞いてな|残.*な/,
  };
  const matchedDomains = Object.keys(dissonanceDomains)
    .filter((key) => dissonanceDomains[key].test(content));

  if (matchedDomains.length < 2) {
    failedChecks.push(
      `違和感が${matchedDomains.length === 0 ? "未検出" : `「${matchedDomains[0]}」のみ`} — 同一原因で説明できる可能性がある（異なるドメインを2種類以上組み合わせること）`
    );
  }

  // 「1発理解できる状態」を作っていないか
  // 状況変化パターン（増えた→戻る、あった→消えた、見えた→記録にない など）を確認
  const stateChangePairs: [RegExp, RegExp][] = [
    [/増え(た|てた|ていた)/, /戻(っ|り)(て|た|いた)|減(っ|り)(て|た)|消え/],
    [/あ(っ|り)(た|て)/, /消え(て|た|ていた|てた)|な(く|かっ)(な|た)|見当たらな/],
    [/見え(た|てた|ていた)/, /記録(に|が)(な|ない)|誰(も|が)(見|聞|知).*な|映(っ|り)て.*な/],
    [/聞こえ(た|てた|ていた)/, /誰(も|が)聞.*な|音.*な(かっ|い)/],
    [/動(い|き)(た|て)/, /動い?て?.*な|元.*通り/],
  ];
  const hasStateChange = stateChangePairs.some(([a, b]) => a.test(content) && b.test(content));

  // 代替: 確信崩し語が2種類以上あれば「理解できない状態を作れている」とみなす
  const breakerWords = ["たぶん","気のせい","よくわからない","なんか","かもしれない","だろうか","うまく言えない"];
  const breakerCount = breakerWords.filter((w) => content.includes(w)).length;

  if (!hasStateChange && breakerCount < 2) {
    failedChecks.push("「理解できそうで確信できない状態」不足（状況変化 or 確信崩し語×2 必要）");
  }

  const tier: HorrorTier =
    overall >= HORROR_TIERS.good  && failedChecks.length === 0 ? "good" :
    overall >= HORROR_TIERS.minor                              ? "minor" : "bad";

  return {
    tier,
    passed: tier === "good",
    scores,
    overall,
    failedChecks,
  };
}

/* ── 改善案生成（ルールベース・無料） ── */
export function makeSuggestions(scores: MicroScore, failedChecks: string[]): HorrorSuggestion[] {
  const s: HorrorSuggestion[] = [];

  if (scores.hookStrength < 70 || failedChecks.some((c) => c.includes("フック"))) {
    s.push({
      type:        "フック強化",
      description: "冒頭1行を体験系・違和感系の短いフックに変更",
      instruction: "最初の1行だけ書き直す。20文字以内で体験系（「病院の夜って〜」）か違和感系（「あの部屋だけ〜」）に変更。他は一切変えない。",
    });
  }

  if (scores.dissonance < 50 || failedChecks.some((c) => c.includes("違和感"))) {
    s.push({
      type:        "違和感を増やす",
      description: "「なんか」「気のせい」「でも」などを1〜2個追加",
      instruction: "「でも」「なんか」「気のせい」「たぶん」「よくわからないけど」のいずれかを自然な位置に1〜2個追加する。説明は絶対に追加しない。",
    });
  }

  if (scores.commentability < 50 || failedChecks.some((c) => c.includes("コメント"))) {
    s.push({
      type:        "余白を増やす",
      description: "末尾の説明・結論部分を削除し、状態だけ残す",
      instruction: "最後の1〜2文を削除して、状態・描写だけで終わらせる。結論・感想・説明を追加しない。",
    });
  }

  if (scores.humanness < 60 || failedChecks.some((c) => c.includes("人間らしさ"))) {
    s.push({
      type:        "人間っぽく崩す",
      description: "口語化し、完璧な文章を崩す",
      instruction: "「です・ます」を口語に変え、短く区切る。「なんか」「ちょっと」を自然に混ぜる。完璧な文章を崩す。",
    });
  }

  if (failedChecks.some((c) => c.includes("結論"))) {
    s.push({
      type:        "コメント誘発を上げる",
      description: "解釈が複数できる終わり方に変更",
      instruction: "最後の結論部分を削除し、「〜だったと思う」「よくわからないけど」で終わらせる。読者が解釈できる余白を残す。",
    });
  }

  if (failedChecks.some((c) => c.includes("同一原因"))) {
    s.push({
      type:        "矛盾する違和感を追加",
      description: "既存の違和感と別種類の違和感を加えて「1つの答えで説明できない」構造にする",
      instruction: [
        "現在の違和感に「別の種類」の違和感を1つ追加する。",
        "・数量の違和感がある → 位置・時間・感覚のどれかを追加",
        "・存在の違和感がある → 記録・温度・時刻のどれかを追加",
        "・感覚の違和感がある → 数量・場所・時間のどれかを追加",
        "追加した違和感は絶対に説明しない。状態だけ書く。",
      ].join("\n"),
    });
  }

  if (failedChecks.some((c) => c.includes("確信できない"))) {
    s.push({
      type:        "状況変化を追加",
      description: "違和感のあとに「状況が変わる」要素を加えて確信を崩す",
      instruction: [
        "違和感の後に以下のような「状況変化」を1つ追加する。",
        "・増えた → 戻っていた",
        "・あった → 消えていた",
        "・見えた → 記録にない",
        "・聞こえた → 誰も聞いていない",
        "説明は一切しない。状態だけ書いて終わる。",
      ].join("\n"),
    });
  }

  return s.slice(0, 3);
}

/* ─────────────────────────────────────────────────────────────
   POST ハンドラ（生成1回のみ・自動再生成なし）
   ───────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { genre, postType, theme, accountId } = body as {
      genre:      string;
      postType:   string;
      theme?:     string;
      accountId?: string;
    };

    if (!genre || !postType) {
      return NextResponse.json({ error: "genre と postType は必須" }, { status: 400 });
    }

    const budgetCheck = await checkBudget();
    if (!budgetCheck.ok) {
      return NextResponse.json({ error: budgetCheck.message, overBudget: true }, { status: 429 });
    }

    /* 予算残量チェック（80%超なら警告フラグ）*/
    let budgetWarning = false;
    try {
      const bs = await getBudgetStatus();
      if (!bs.isUnlimited && bs.percentage !== null && bs.percentage > 80) {
        budgetWarning = true;
      }
    } catch { /* 無視 */ }

    /* アカウントスタイル */
    let accountStyle = "";
    if (accountId) {
      const account = await prisma.account.findUnique({ where: { id: accountId } });
      if (account?.style) accountStyle = `\nアカウントのスタイル: ${account.style}`;
    }

    /* 学習済みパターン */
    let patterns = "";
    let usedPatternLabels: string[] = [];
    if (accountId) {
      const learned = await prisma.learningPattern.findMany({
        where: { accountId }, orderBy: { weight: "desc" }, take: 5,
      });
      if (learned.length > 0) {
usedPatternLabels = learned.map((p: { pattern: string }) => p.pattern);

patterns = "\n\n## 学習済みパターン（優先活用）\n" +
  learned.map((p: { pattern: string; weight: number }) => "- " + p.pattern + "（重み: " + p.weight + "）").join("\n");      }
    }

    /* バズ投稿から構造のみ学習 */
    let buzzNote = "";
    if (accountId) {
      const buzzPosts = await prisma.buzzPost.findMany({
        where:   { accountId, likes: { gt: 0 } },
        orderBy: { likes: "desc" },
        take:    3,
        select:  { content: true, likes: true },
      });
      if (buzzPosts.length > 0) {
const structures = buzzPosts.map((b: any) => {         const lines = b.content.split(/\n/).filter((l: string) => l.trim());
          const hasContrast  = /でも|実は|意外と|ところが/.test(b.content);
          const hasAmbiguity = /たぶん|気のせい|なんか|よくわからない/.test(b.content);
          const last = b.content.trim().slice(-10);
          const endType = /[？?]$/.test(last) ? "問い" : /[。]$/.test(last) ? "余韻" : "断絶";
          return `・冒頭${(lines[0] ?? "").length}字・${lines.length}段落・対比:${hasContrast ? "あり" : "なし"}・曖昧:${hasAmbiguity ? "あり" : "なし"}・締め:${endType}（いいね:${b.likes}）`;
        }).join("\n");
        buzzNote = `\n\n## バズ投稿の構造パターン（参考のみ・内容コピー禁止）\n${structures}`;
      }
    }

    const userContent = [
      `ジャンル: ${genre}`,
      `投稿タイプ: ${postType}`,
      theme ? `テーマ・ネタ: ${theme}` : "",
      accountStyle,
      patterns,
      buzzNote,
    ].filter(Boolean).join("\n");

    const anthropic = await getAnthropicClient();
    const response  = await anthropic.messages.parse({
      model:      "claude-sonnet-4-6",
      max_tokens: 2048,
      system: [{ type: "text", text: HORROR_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userContent }],
      output_config: { format: zodOutputFormat(OutputSchema) },
    });

    if (!response.parsed_output) {
      return NextResponse.json({ error: "生成に失敗しました" }, { status: 500 });
    }

    const costUsd = await addUsage(response.usage.input_tokens, response.usage.output_tokens);

    const posts = response.parsed_output.posts.map((post) => {
      const v           = validatePost(post.content);
      const suggestions = v.tier !== "good" ? makeSuggestions(v.scores, v.failedChecks) : [];
      return {
        ...post,
        horrorTier:         v.tier,
        horrorPassed:       v.passed,
        horrorOverall:      v.overall,
        horrorFailedChecks: v.failedChecks,
        horrorScores:       v.scores,
        horrorSuggestions:  suggestions,
      };
    });

    return NextResponse.json({
      posts,
      budgetWarning,
      usedPatterns: usedPatternLabels,
      usage: {
        inputTokens:  response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        costUsd,
        costJpy: Math.ceil(costUsd * 150),
      },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "ホラー生成中にエラー";
    console.error("[/api/generate/horror]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
