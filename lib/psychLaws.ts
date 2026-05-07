export type PostType = "バズ" | "考察" | "刺さる";

export type PsychLawId =
  | "zeigarnik"          // ツァイガルニク効果
  | "cognitive_dissonance" // 認知的不協和
  | "cocktail_party"     // カクテルパーティー効果
  | "social_proof"       // 社会的証明
  | "loss_aversion"      // 損失回避
  | "mere_exposure"      // 単純接触効果
  | "peak_end"           // ピークエンドの法則
  | "framing"            // フレーミング効果
  | "anchoring"          // アンカリング効果
  | "barnum"             // バーナム効果

export type PsychLaw = {
  id:              PsychLawId;
  name:            string;        // 日本語名
  academic:        string;        // 学術名（英語）
  icon:            string;
  definition:      string;        // 法則の定義
  mechanism:       string;        // 脳内メカニズム
  postTechnique:   string;        // 投稿への実装方法
  example:         string;        // 実例
  antiPattern:     string;        // やってはいけない使い方
  postTypes:       PostType[];
  color:           string;
};

export const PSYCH_LAWS: PsychLaw[] = [
  {
    id:        "zeigarnik",
    name:      "ツァイガルニク効果",
    academic:  "Zeigarnik Effect",
    icon:      "⏳",
    definition:"未完了・中断されたタスクは完了済みより記憶に残りやすい",
    mechanism: "未完了の認知的緊張が解消されるまで前頭葉が注意リソースを確保し続ける",
    postTechnique:
      "冒頭に問いを立て「答えは最後に」「続きは→」で引っ張る。シリーズ化して前回の謎を引き継ぐ構造も有効",
    example:   "「この方法を知ってから人生が変わった。でも、最初に失敗したことがある。」",
    antiPattern:"結末をぼかし続けてフラストレーションを与える（承認欲求目的のファーミング）",
    postTypes:  ["考察", "刺さる"],
    color:      "bg-violet-900/40 text-violet-400",
  },
  {
    id:        "cognitive_dissonance",
    name:      "認知的不協和",
    academic:  "Cognitive Dissonance",
    icon:      "⚡",
    definition:"自分の信念・行動と矛盾する情報に接したとき、不快感から解消しようとする心理",
    mechanism: "前帯状回が矛盾検知シグナルを出し、不快感を解消するための情報処理が活発化する",
    postTechnique:
      "「〜だと思っていたが、実は逆だった」「あなたの常識は本当に正しいか」で読者の信念に揺さぶりをかける",
    example:   "「努力は必ず報われる。これは正しい。でも科学的には、正しい努力でないと逆効果なことがある。」",
    antiPattern:"信念を否定して恐怖感・不安を過度に与える（煽り・炎上目的）",
    postTypes:  ["考察", "バズ"],
    color:      "bg-orange-900/40 text-orange-400",
  },
  {
    id:        "cocktail_party",
    name:      "カクテルパーティー効果",
    academic:  "Cocktail Party Effect",
    icon:      "🎯",
    definition:"雑多な情報の中でも自分に関連する刺激（名前・状況）には自動的に注意が向く",
    mechanism: "脳の網様体賦活系（RAS）が自己参照的情報を優先処理するフィルタリング機能",
    postTechnique:
      "「〇〇している人へ」「〜で悩んでいる人だけ読んで」などターゲットを明確に名指しして注意を引く",
    example:   "「夜に一人でスマホを見ているあなたへ。」",
    antiPattern:"過度な個人情報の要求・プロファイリングへの誘導",
    postTypes:  ["バズ", "刺さる"],
    color:      "bg-cyan-900/40 text-cyan-400",
  },
  {
    id:        "social_proof",
    name:      "社会的証明",
    academic:  "Social Proof",
    icon:      "👥",
    definition:"他者の行動・評価を基準に自分の行動を決める心理",
    mechanism: "不確実性が高い状況で前帯状回が「多数派の行動=正しい」と解釈する社会的学習回路",
    postTechnique:
      "「〇〇人がやっている」「話題になっている」「多くの人が気づいていない」で正当性を付与する",
    example:   "「先週だけで3万人が試したノート術。」",
    antiPattern:"偽りの数字・無意味な数値で誘導するファーミング（「いいねが1000超えた」等）",
    postTypes:  ["バズ"],
    color:      "bg-green-900/40 text-green-400",
  },
  {
    id:        "loss_aversion",
    name:      "損失回避",
    academic:  "Loss Aversion",
    icon:      "🔴",
    definition:"同額の利益より損失の方が約2.25倍強く感じられる（プロスペクト理論）",
    mechanism: "損失処理に扁桃体が強く反応し、リスク回避のための行動動機が高まる",
    postTechnique:
      "「知らないと損」「やめると差がつく」「後悔する前に」など損失フレームで行動を促す",
    example:   "「これを知らずに生きると、10年後の自分が後悔する。」",
    antiPattern:"「しないと終わる」「人生詰む」など過度な恐怖・不安を煽る（禁止）",
    postTypes:  ["バズ", "刺さる"],
    color:      "bg-red-900/40 text-red-400",
  },
  {
    id:        "mere_exposure",
    name:      "単純接触効果",
    academic:  "Mere Exposure Effect",
    icon:      "🔄",
    definition:"繰り返し接触するだけで好意・親しみやすさが増す",
    mechanism: "知覚流暢性の向上が処理コストを下げ、ポジティブ感情として誤帰属される",
    postTechnique:
      "同じコンセプト・スタイル・言葉を一貫して使い続ける。定型フレームでシリーズ化する",
    example:   "毎朝の「今日の気づき」シリーズで読者との親しみを積み重ねる",
    antiPattern:"飽きられた型（同じ構造の繰り返し）による無意識のスクロール",
    postTypes:  ["刺さる", "考察"],
    color:      "bg-blue-900/40 text-blue-400",
  },
  {
    id:        "peak_end",
    name:      "ピークエンドの法則",
    academic:  "Peak-End Rule",
    icon:      "🏔",
    definition:"体験の評価はピーク（最も強烈な瞬間）と最後の印象で決まる",
    mechanism: "記憶は全体平均ではなくピーク+終端の2点から再構成される（カーネマン）",
    postTechnique:
      "投稿内に「感情のピーク（驚き・共感・笑い）」を1つ配置し、締めを印象的にする",
    example:   "「普通の話かと思ったら、最後の一行で泣いた。」という構造を意図的に作る",
    antiPattern:"感情を操作して購買・行動を強制する（煽り系ランディングページ的手法）",
    postTypes:  ["刺さる", "考察"],
    color:      "bg-yellow-900/40 text-yellow-400",
  },
  {
    id:        "framing",
    name:      "フレーミング効果",
    academic:  "Framing Effect",
    icon:      "🖼",
    definition:"同じ事実でも提示の枠組みによって受け手の判断が変わる",
    mechanism: "損失vs利益フレームで扁桃体の活性化パターンが変わり、評価が逆転する",
    postTechnique:
      "「90%が失敗する」vs「10%が成功している」のように、同じデータをどのフレームで見せるか設計する",
    example:   "「手術の成功率90%」と「死亡率10%」は同じ事実。後者は不安を強くする",
    antiPattern:"マイナスフレームを過剰に使って恐怖・不安で行動させる（詐欺的誘導）",
    postTypes:  ["バズ", "考察"],
    color:      "bg-indigo-900/40 text-indigo-400",
  },
  {
    id:        "anchoring",
    name:      "アンカリング効果",
    academic:  "Anchoring Effect",
    icon:      "⚓",
    definition:"最初に提示された数値・情報が判断の基準点（アンカー）となる",
    mechanism: "初期情報が前頭前野の基準値設定に影響し、後続の判断がそこからの調整になる",
    postTechnique:
      "「普通なら〇〇時間かかる→でもこの方法なら〇分」「月収100万以上の人が普段やっていること」で比較基準を設定",
    example:   "「本来100冊読む内容を、この1投稿で理解できる。」",
    antiPattern:"根拠のない数字でアンカーを張る（詐欺的比較・誤情報）",
    postTypes:  ["バズ", "考察"],
    color:      "bg-amber-900/40 text-amber-400",
  },
  {
    id:        "barnum",
    name:      "バーナム効果",
    academic:  "Barnum Effect / Forer Effect",
    icon:      "🪄",
    definition:"誰にでも当てはまる漠然とした記述を「自分のことだ」と感じる心理",
    mechanism: "自己参照効果と確証バイアスが組み合わさり、曖昧な記述を自己関連づけする",
    postTechnique:
      "「こんな経験ない？」「心当たりある人は多いはず」「わかる人にはわかる」で普遍的な体験を個人的なものとして感じさせる",
    example:   "「完璧にやらなきゃ、と思うと逆に何もできなくなる。これ、あなたも経験ない？」",
    antiPattern:"ステレオタイプや偏見を「あるある」として正当化する（差別的コンテンツ）",
    postTypes:  ["刺さる"],
    color:      "bg-pink-900/40 text-pink-400",
  },
];

/* ------------------------------------------------------------------ */
/* 投稿タイプごとの自動選択                                             */
/* ------------------------------------------------------------------ */

export const AUTO_LAW_MAP: Record<PostType, PsychLawId[]> = {
  "バズ":   ["anchoring", "framing", "cocktail_party"],
  "考察":   ["zeigarnik", "cognitive_dissonance", "peak_end"],
  "刺さる": ["barnum", "mere_exposure", "loss_aversion"],
};

/* ------------------------------------------------------------------ */
/* Helper                                                               */
/* ------------------------------------------------------------------ */

export function getLaw(id: PsychLawId): PsychLaw {
  return PSYCH_LAWS.find((l) => l.id === id) ?? PSYCH_LAWS[0];
}

export function getAutoLaws(postType: PostType): PsychLaw[] {
  return AUTO_LAW_MAP[postType].map(getLaw);
}

/* ------------------------------------------------------------------ */
/* Claude プロンプトビルダー                                            */
/* ------------------------------------------------------------------ */

const LAW_SAFETY_RULES = [
  "・損失回避・フレーミングは「過度な恐怖・不安の煽り」になってはいけない",
  "・認知的不協和は「信念を否定して不安を与える」のではなく「新しい視点を提示する」ために使う",
  "・社会的証明は根拠のない数字を使ってはいけない",
  "・バーナム効果は差別的ステレオタイプを「あるある」として正当化してはいけない",
  "・いかなる法則も「エンゲージメントファーミング」の手段にしてはいけない（いいねしたら〜、RTしたら〜 等）",
];

export function buildPsychLawPrompt(laws: PsychLaw[]): string {
  if (!laws.length) return "";

  const lawLines = laws.map((l) =>
    [
      `### ${l.name}（${l.icon} ${l.academic}）`,
      `定義: ${l.definition}`,
      `メカニズム: ${l.mechanism}`,
      `投稿への実装: ${l.postTechnique}`,
      `例: ${l.example}`,
      `禁止パターン: ${l.antiPattern}`,
    ].join("\n")
  );

  return [
    "",
    "## 心理法則エンジン（全3案に適用）",
    "以下の心理法則を投稿構造に組み込むこと。",
    lawLines.join("\n\n"),
    "",
    "## 心理法則使用時の安全制約",
    LAW_SAFETY_RULES.join("\n"),
    "",
    "## 出力要件",
    "各案で psychLawsApplied（使用した法則の日本語名リスト）と",
    "psychLawExplanation（どのように活用したか1〜2行）を必ず出力すること。",
  ].join("\n");
}
