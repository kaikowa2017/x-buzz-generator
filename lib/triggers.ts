export type PostType = "バズ" | "考察" | "刺さる";

export type TriggerId =
  | "curiosity_gap"
  | "zeigarnik"
  | "incongruity"
  | "empathy"
  | "loss_aversion"
  | "social_proof"
  | "answer_verification"
  | "comment_branching"
  | "double_take";

export type Trigger = {
  id:          TriggerId;
  name:        string;
  icon:        string;
  description: string;  // 一言説明
  mechanism:   string;  // 作動原理
  technique:   string;  // 実装テクニック（プロンプト用）
  postTypes:   PostType[];
  color:       string;
};

export const TRIGGERS: Trigger[] = [
  {
    id:          "curiosity_gap",
    name:        "好奇心ギャップ",
    icon:        "🧩",
    description: "情報の欠落を意図的に作り「続きが知りたい」を生む",
    mechanism:   "知識の空白が埋まるまで人は集中し続ける（情報ギャップ理論）",
    technique:   "冒頭に疑問・欠落情報を置き、答えを後半に配置する。「〜の理由が判明した」「誰も教えてくれなかった〜」等のフォーマット",
    postTypes:   ["バズ", "考察"],
    color:       "bg-blue-900/40 text-blue-400",
  },
  {
    id:          "zeigarnik",
    name:        "未完了効果",
    icon:        "⏳",
    description: "未完了の物事の方が完了済みより記憶に残る",
    mechanism:   "未完了タスクへの注意が持続するツァイガルニク効果",
    technique:   "答えを途中で止める・続きを次の投稿に持ち越す・「…」で終わる・「第一弾」を匂わせる",
    postTypes:   ["考察", "刺さる"],
    color:       "bg-purple-900/40 text-purple-400",
  },
  {
    id:          "incongruity",
    name:        "違和感検知",
    icon:        "👁",
    description: "予想と異なる要素を置き、脳の注意機能を強制起動させる",
    mechanism:   "予測誤差が大きいほど記憶に残る（予測的符号化理論）",
    technique:   "常識と逆の事実・意外な組み合わせ・「実は〜」「逆に〜」・矛盾するように見えて正しい命題",
    postTypes:   ["バズ", "考察"],
    color:       "bg-orange-900/40 text-orange-400",
  },
  {
    id:          "empathy",
    name:        "共感",
    icon:        "💙",
    description: "読者が「自分のことだ」と感じる体験・感情を描写する",
    mechanism:   "ミラーニューロンが他者体験を自己体験として処理し感情が動く",
    technique:   "「こういう人いる」「〜で悩んでた頃」「あの時の自分へ」等の視点。具体的な場面・感情の言語化",
    postTypes:   ["刺さる"],
    color:       "bg-pink-900/40 text-pink-400",
  },
  {
    id:          "loss_aversion",
    name:        "損失回避",
    icon:        "⚡",
    description: "得ることより失うことへの恐れを活用する（2倍の心理的インパクト）",
    mechanism:   "プロスペクト理論：損失の痛みは利益の喜びの約2.25倍",
    technique:   "「知らないと損」「やめた方がいいこと」「〜を続けると〜になる」。但し過度な脅しは禁止",
    postTypes:   ["バズ", "刺さる"],
    color:       "bg-red-900/40 text-red-400",
  },
  {
    id:          "social_proof",
    name:        "社会的証明",
    icon:        "👥",
    description: "多くの人が認めている・やっているという事実で行動を促す",
    mechanism:   "社会的不確実性の中で他者の行動を判断基準にする本能",
    technique:   "「〇〇人がやっている」「話題の〜」「みんなが知っている〜」。具体的な数字や実績が効果的",
    postTypes:   ["バズ"],
    color:       "bg-green-900/40 text-green-400",
  },
  {
    id:          "answer_verification",
    name:        "答え合わせ欲求",
    icon:        "✅",
    description: "読者に予測させた後に答えを提示し、確認したい欲求を生む",
    mechanism:   "予測の一致/不一致が報酬系を刺激する（予測的符号化理論）",
    technique:   "「〜だと思う人、正解です」「実はAではなくB」「あなたはどちら？」後に答えを提示",
    postTypes:   ["考察", "バズ"],
    color:       "bg-yellow-900/40 text-yellow-400",
  },
  {
    id:          "comment_branching",
    name:        "コメント分岐",
    icon:        "💬",
    description: "AかBか迷う状況を提示し、意見を言わずにはいられなくする",
    mechanism:   "認知的不協和が解消されるまで行動し続ける心理的衝動",
    technique:   "「賛成/反対どちら？」「あなたはA派？B派？」「こういう場合どうする？」末尾に問いかけを置く",
    postTypes:   ["刺さる", "考察"],
    color:       "bg-cyan-900/40 text-cyan-400",
  },
  {
    id:          "double_take",
    name:        "二度見の曖昧さ",
    icon:        "🔀",
    description: "一瞬意味が取れない言葉・逆説で視線を引き戻させる",
    mechanism:   "脳が意味処理に失敗すると自動的に再試行する反射機能",
    technique:   "逆説的な真実・多義的な言葉・「〜なのに〜」の構造・写真と文章のギャップを意図的に作る",
    postTypes:   ["バズ", "考察"],
    color:       "bg-indigo-900/40 text-indigo-400",
  },
];

/* ------------------------------------------------------------------ */
/* 自動選択マップ                                                       */
/* ------------------------------------------------------------------ */

export const AUTO_TRIGGER_MAP: Record<PostType, TriggerId[]> = {
  "バズ":   ["curiosity_gap", "incongruity"],
  "考察":   ["zeigarnik", "answer_verification"],
  "刺さる": ["empathy", "comment_branching"],
};

/* ------------------------------------------------------------------ */
/* Helper                                                               */
/* ------------------------------------------------------------------ */

export function getTrigger(id: TriggerId): Trigger {
  return TRIGGERS.find((t) => t.id === id) ?? TRIGGERS[0];
}

export function getAutoTriggers(postType: PostType): Trigger[] {
  return AUTO_TRIGGER_MAP[postType].map(getTrigger);
}

/* ------------------------------------------------------------------ */
/* Claude プロンプトビルダー                                            */
/* ------------------------------------------------------------------ */

const SAFETY_RULES = [
  "・不安を過度に煽る表現は禁止（「このままでは人生終わる」等）",
  "・根拠のない収益・健康効果の断言は禁止（「必ず稼げる」等）",
  "・詐欺的誘導は禁止（「今すぐしないと損」など恐怖で行動させる）",
  "・過激・暴力的表現は禁止",
  "・誤情報の拡散につながる表現は禁止",
  // エンゲージメントファーミング（X利用規約 明示禁止）
  "・エンゲージメントファーミング禁止: 「いいねしたら〜」「RTしたら〜」「フォローしたら〜」「コメントした人に〜」など、反応と引き換えに報酬を提示する構造は絶対禁止",
  "・「〇〇な人はいいね」「全員リプして」など反応を命令・要求する表現は禁止",
  "・拡散希望の過剰な繰り返しは禁止",
  "・代わりに: 好奇心・共感・違和感・答え合わせ欲求など、自然に反応したくなる構造を使うこと",
];

export function buildTriggerPrompt(triggers: Trigger[]): string {
  if (triggers.length === 0) return "";

  const triggerLines = triggers.map((t) =>
    `### ${t.name}（${t.icon}）\n作動原理: ${t.mechanism}\n実装方法: ${t.technique}`
  );

  return [
    "",
    "## 心理トリガー設計（3案すべてに適用すること）",
    triggerLines.join("\n\n"),
    "",
    "## 安全制約（Xルール・倫理基準 — 厳守）",
    SAFETY_RULES.join("\n"),
    "",
    "## 出力要件",
    "各案で triggersApplied（実際に使ったトリガー名の日本語リスト）と",
    "triggerAim（この投稿でのトリガーの狙いを1〜2行で）を必ず含めること。",
  ].join("\n");
}
