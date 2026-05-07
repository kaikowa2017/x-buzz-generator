import { NextResponse } from "next/server";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "@/lib/claude";
import { prisma } from "@/lib/prisma";
import { checkBudget, addUsage } from "@/lib/budget";
import { getTrigger, buildTriggerPrompt, type TriggerId } from "@/lib/triggers";
import { getLaw, buildPsychLawPrompt, getAutoLaws, type PsychLawId, type PostType as PsychPostType } from "@/lib/psychLaws";

export type PostType = "バズ" | "考察" | "刺さる";

const OutputSchema = z.object({
  posts: z
    .array(
      z.object({
        content: z.string().describe("X(Twitter)への投稿文。280文字以内。"),
        imagePrompt: z
          .string()
          .describe("Midjourney/DALL-E向けの画像生成プロンプト（英語）。"),
        videoPrompt: z
          .string()
          .describe("Runway/Pika向けの動画生成プロンプト（英語）。"),
        triggersApplied: z
          .array(z.string())
          .describe("この案で実際に使った心理トリガーの名前（日本語）。例: [\"好奇心ギャップ\", \"違和感検知\"]"),
        triggerAim: z
          .string()
          .describe("この案における心理トリガーの狙いを1〜2行で説明"),
        psychLawsApplied: z
          .array(z.string())
          .describe("この案で実際に使った心理法則の名前（日本語）。例: [\"ツァイガルニク効果\", \"バーナム効果\"]"),
        psychLawExplanation: z
          .string()
          .describe("心理法則をどのように投稿に組み込んだかを1〜2行で説明"),
      })
    )
    .length(3)
    .describe("3つの投稿案"),
});

const SYSTEM_PROMPT = `あなたはX(Twitter)バイラルコンテンツの専門家です。
ジャンルと投稿タイプに応じて、高エンゲージメントな投稿を3案生成します。
各案には投稿文・画像プロンプト・動画プロンプトをセットで出力してください。

## 投稿タイプ別の書き方

### バズ
- 冒頭3秒で引きつける強烈なフック（数字・衝撃的事実・疑問形）
- ツイートが独立して完結する短い文
- リツイートしたくなる「使える情報」か「共感」を入れる
- 例フック: 「知らなかった人は損してる」「99%が間違ってる」「〇〇したら人生変わった」

### 考察
- 一般的な認識への問いかけから始める
- 独自の視点・切り口を明示する
- 論理的な流れで説得力を持たせる
- 例フック: 「〜について本質的に考えると」「表面的には〜だが実は」「多くの人が見落としてること」

### 刺さる
- 特定の読者の感情に直撃する言葉を選ぶ
- 「あなたのことを言ってる」と感じさせる具体性
- 痛みや共感から始まり、希望で終わる構成
- 例フック: 「こういう人、いる」「〜で悩んでたとき」「誰も言ってくれなかったこと」

## ジャンル別スタイル

| ジャンル | トーン | キーワード傾向 |
|---|---|---|
| horror / ホラー | 不気味・緊迫 | 怪異・実話・闇 |
| business / ビジネス | 知的・実践的 | 生産性・戦略・結果 |
| lifestyle / ライフスタイル | 温かみ・共感 | 習慣・暮らし・豊かさ |
| knowledge / 知識 | 発見・驚き | 実は・知らなかった・真実 |
| tech / テック | 革新・先進 | AI・自動化・未来 |
| health / 健康 | 安心・科学的 | 体・食事・睡眠 |

## 画像プロンプトのルール
- 英語で記述
- スタイル + 被写体 + 雰囲気 + 品質タグの構成
- Midjourney/DALL-E両対応の汎用形式
- 例: "cinematic photo of abandoned hospital corridor, eerie fog, dramatic shadows, 4K, photorealistic"

## 動画プロンプトのルール
- 英語で記述
- カメラワーク + 被写体 + 動き + ムード + 秒数の構成
- Runway/Pika両対応の汎用形式
- 例: "slow push-in shot of flickering candle in dark room, mysterious atmosphere, 10s clip, cinematic"

## 出力ルール
- 投稿文は日本語、プロンプトは英語
- 投稿文は280文字以内
- 3案はそれぞれ異なる切り口・フック・構成にする
- ハッシュタグは不要（自然な文体を優先）

## 人間らしさ最適化（全案に必須）

### 禁止
- 完璧すぎる文体（読んで「作られた感」「コンテンツ感」がするもの）
- 説明しすぎ・まとめすぎ（「つまり〜ということです」で全部回収する）
- 感情の過剰表現（「感動した！」「絶対おすすめ！」「人生変わる！」）
- テクニック丸出しの構造（「この3つを知ると〜」等のパターン感）
- 断定的な結論で終わる（「〜が正解です」「〜しなければなりません」）

### 必須
- 少しラフ・崩れた文体（完璧な文章にしない。書き直した痕跡が残る感じ）
- 曖昧表現を自然に混ぜる（「なんか」「ちょっと」「〜な気がする」「〜かもしれない」）
- 主観を入れる（「自分は」「個人的には」「なんとなく」）
- 考えさせる余白（結論を言い切らない。問いかけ or 含みを残して終わる）
- 口語・日常語（書き言葉より話し言葉寄り）

### 自然化の具体例
NG: 「成功者が実践している朝の習慣7選。これを知るだけで人生が変わります。」
OK: 「朝5時に起きてから、なんかちょっとずつ変わってる気がしてる。うまく言えないけど。」

NG: 「多くの人が実践している方法を紹介します。効果は科学的に証明されています。」
OK: 「みんなやってるから自分もやってみた。思ってたのと違った。でもそれが良かった。」

### 心理法則の運用方針
心理法則は投稿の【構造設計・内部ロジック】としてのみ使う。
投稿文の【表面・言葉】には一切出さない。
読んだ人が「なんか気になる」「なんか共感できる」と自然に感じる設計にする。
テクニックを使っている感は0にすること。

## エンゲージメントファーミング禁止（X利用規約 厳守）
以下の表現は絶対に使用しないこと:

### 禁止（blocked）
- 「いいねしたら○○」「RTしたら○○」「フォローしたら○○」「コメントした人に○○」
- 報酬や特典と引き換えに反応を求める構造全般
- 「全員リプして」「全員コメントして」
- 拡散希望の2回以上の繰り返し

### 禁止（caution）
- 「○○な人はいいね」「○○に賛成な人はRT」（反応を命令する表現）
- 「いいねが100になったら続きを投稿」（条件付きコンテンツ）
- 「何でもいいのでコメントしてください」

### 代わりに使うべき表現
反応を"要求"せず、反応"したくなる"構造にすること:
- 好奇心ギャップ → 「続きが知りたい」を自然に生む
- 違和感検知 → 「あれ？」と二度読みしたくなる
- コメント分岐 → 「自分の意見を言いたい」が自然に湧く
- 答え合わせ欲求 → 「当たってた？」を確認したくなる
- 共感 → 「これ私だ」とシェアしたくなる`;


export async function POST(req: Request) {
  try {
  const body = await req.json().catch(() => ({}));
  const { genre, postType, postLength, theme, accountId, panelCount, imageStyle, aspectRatio, triggerIds, psychLawIds, naturalBreak } = body as {
    genre: string;
    postType: PostType;
    postLength?: "short" | "medium" | "long";
    theme?: string;
    accountId?: string;
    panelCount?: number;
    imageStyle?: string;
    aspectRatio?: string;
    triggerIds?: TriggerId[];
    psychLawIds?: PsychLawId[];
    naturalBreak?: boolean;
  };

  if (!genre || !postType) {
    return NextResponse.json(
      { error: "genre と postType は必須です" },
      { status: 400 }
    );
  }

  // 予算チェック
  const budgetCheck = await checkBudget();
  if (!budgetCheck.ok) {
    return NextResponse.json({ error: budgetCheck.message, overBudget: true }, { status: 429 });
  }

  // アカウントのスタイル情報を取得
  let accountStyle = "";
  if (accountId) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (account?.style) accountStyle = `\nアカウントのスタイル: ${account.style}`;
  }

  // 学習済みパターンを取得
  let patterns = "";
  let usedPatternLabels: string[] = [];
  if (accountId) {
    const learned = await prisma.learningPattern.findMany({
      where: { accountId },
      orderBy: { weight: "desc" },
      take: 5,
    });
    if (learned.length > 0) {
      usedPatternLabels = learned.map((p) => p.pattern);
      patterns = "\n\n## 学習済み高エンゲージメントパターン（優先的に活用）\n" +
        learned.map((p) => `- ${p.pattern}（重み: ${p.weight}）`).join("\n");
    }
  }

  // 画像構成ノート
  const arNote    = aspectRatio ? ` アスペクト比: ${aspectRatio}` : "";
  const styleNote = imageStyle  ? ` スタイル: ${imageStyle}` : "";
  const panelNote = (() => {
    if (!panelCount || panelCount <= 1) {
      return (arNote || styleNote) ? `\n画像構成: 1枚${styleNote}${arNote}` : "";
    }
    if (panelCount === 4) {
      return `\n画像構成: 4コマ漫画（4枚組）${styleNote}${arNote} — 投稿文に「全4コマ」など枚数を自然に含めること`;
    }
    return `\n画像構成: ${panelCount}枚構成${styleNote}${arNote} — 投稿文に「${panelCount}枚構成」など枚数を自然に含めること`;
  })();

  // ホラージャンル専用ロジック
  const isHorror = /horror|ホラー|怪談|恐怖/i.test(genre);
  const horrorNote = isHorror ? `

## ホラージャンル専用ロジック（最優先で適用）

### 禁止（絶対に書かない）
- 原因・理由の説明（「なぜそうなったか」を書かない）
- 結論をはっきり書く（「つまり〇〇だった」「〇〇が原因だった」は禁止）
- 話を完結させる（謎を解決しない・終わらせない）
- 「怖かった」「恐ろしい」など感情の直接説明

### 必須要素
- 途中で止める（文章が終わっていないような余韻）
- 説明のつかない違和感を1つ以上残す
- 1つは未解決の要素を必ず残す（「あれは何だったのか」が残る構造）
- 読者が自分で解釈できる余白を作る

### 書き方のルール
- 「たぶん」「気のせいかもしれない」「よくわからないけど」で逃げる
- 最後は断定せず、引きずる余韻で終わる
- コメント誘発を最優先にする（「これ何？」「どういうこと？」が自然に出る構造）
- 情景・感覚・細部の描写で没入させ、解釈は読者に委ねる

### 構造例
NG: 「夜中に物音がした。確認したら扉が開いていた。泥棒だったようだ。」
OK:
「夜中に物音がした。
確認しに行ったけど、何もなかった。

ただ、玄関の扉だけ。
内側から、鍵がかかってた。

気のせいだと思いたい。」` : "";

  // 文字数モード
  const lengthNote = (() => {
    if (postLength === "short") return `
## 文字数モード: 短文（〜100文字）
- 投稿文は90文字以内で完結させること
- フック1行で完全に終わらせる。説明・補足は一切しない
- 引きだけで終わり、続きを想像させる余白を最大化する
- 複数文は原則禁止。1〜2文で完結させる`;

    if (postLength === "long") return `
## 文字数モード: 長文（250〜500文字）
- 投稿文は270〜480文字で構成すること
- 設定 → 転換 → 余韻 のストーリー構造を必ず作る
- 読者が引き込まれる没入感を意識する（情景・感情・具体的な場面を入れる）
- 結論を言わず、読後感で余韻を残して終わる`;

    // default: medium
    return `
## 文字数モード: 中文（100〜250文字）
- 投稿文は110〜220文字で構成すること
- 違和感のある展開（読者が「あれ？」と感じる転換）を1箇所入れる
- 結論を言い切らず、余白と余韻を残して終わる
- 3〜5文の自然な流れで構成する`;
  })();

  // 心理トリガープロンプト
  const selectedTriggers = (triggerIds ?? []).map(getTrigger);
  const triggerPrompt = buildTriggerPrompt(selectedTriggers);

  // 自然崩しプロンプト
  const naturalBreakPrompt = naturalBreak ? `
## 自然崩しモード（有効）
以下のスタイルで投稿文を崩すこと。

### 崩しルール
- 「いや」「なんか」「ちょっと」「うーん」「でも」「あ、」などの口語挿入語を1〜2個入れる
- 途中で言い直す（「〜だと思う、いや違うな、〜かな」のような揺れ）
- 改行は論理ではなく感情・思考の切れ目で入れる（2〜4回）
- 1文完結を禁止。複数のブロックで構成する
- 断言→疑問→受け入れのように感情を少し揺らす
- 「。」だけで終わらず、余白の一言・問いかけ・含みを残す

### 崩し例
NG: 「朝のルーティンを変えたら、生産性が30%上がりました。科学的にも証明されています。」
OK:
「朝のルーティン変えてみた。
なんか、思ってたより効果あった気がする。

いや、プラシーボかもしれないけど。
でもまあ、続けてる。」

### 注意
- 崩しすぎて意味不明にしない
- 読めるけど「人が書いた感」がある程度にする` : "";

  // 心理法則プロンプト（指定なしの場合は投稿タイプに応じた自動選択）
  const selectedLaws = psychLawIds && psychLawIds.length > 0
    ? psychLawIds.map(getLaw)
    : getAutoLaws(postType as PsychPostType);
  const psychLawPrompt = buildPsychLawPrompt(selectedLaws);

  const userContent = [
    `ジャンル: ${genre}`,
    `投稿タイプ: ${postType}`,
    theme ? `テーマ・ネタ: ${theme}` : "",
    accountStyle,
    panelNote,
    lengthNote,
    horrorNote,
    patterns,
    triggerPrompt,
    psychLawPrompt,
    naturalBreakPrompt,
  ]
    .filter(Boolean)
    .join("\n");

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
      format: zodOutputFormat(OutputSchema),
    },
  });

  if (!response.parsed_output) {
    return NextResponse.json(
      { error: "生成に失敗しました" },
      { status: 500 }
    );
  }

  const usage = response.usage;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheHit  = cacheRead > 0;

  // 使用量を加算
  const costUsd = await addUsage(usage.input_tokens, usage.output_tokens);
  const costJpy = Math.ceil(costUsd * 150);

  return NextResponse.json({
    posts: response.parsed_output.posts,
    usedPatterns: usedPatternLabels,
    usage: {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheCreated: usage.cache_creation_input_tokens ?? 0,
      cacheRead,
      cacheHit,
      costUsd,
      costJpy,
    },
  });
  } catch (err) {
    const message = err instanceof Error ? err.message : "予期しないエラーが発生しました";
    console.error("[/api/generate/claude]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
