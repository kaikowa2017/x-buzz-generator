export type GenerateInput = {
  theme: string;
  genre: string;
  style?: string;
  mood?: string;
  length?: "short" | "medium" | "long";
  patterns?: PatternHint[];
  examples?: string[];
};

export type PatternHint = {
  pattern: string;
  weight: number;
};

export type GeneratedPost = {
  content: string;
  score: number;
  tags: string[];
  imagePromptHint: string;
  videoPromptHint: string;
};

const HOOKS = {
  question: ["なぜ", "知ってた？", "あなたは〜できますか？", "これって普通？"],
  shock: ["衝撃的な事実：", "99%の人が知らない", "やばすぎる", "信じられない"],
  number: ["5つの方法", "3つの理由", "10分で", "1つだけ覚えて"],
  story: ["実話です", "昨日起きたこと", "正直に言います", "失敗しました"],
  value: ["無料で", "今すぐできる", "誰でも", "すぐ使える"],
};

const LENGTHS = {
  short: 60,
  medium: 140,
  long: 280,
};

const GENRE_TEMPLATES: Record<string, string[]> = {
  horror: [
    "【{hook}】{theme}という話を聞いた。{detail}今でも忘れられない。",
    "{theme}で起きた怪異。{detail}あなたの周りでも起きているかもしれない。",
  ],
  business: [
    "【{hook}】{theme}で成功する人の共通点。{detail}明日から試してみて。",
    "{theme}について正直に話します。{detail}これを知るだけで変わる。",
  ],
  lifestyle: [
    "{theme}を始めてから人生が変わった。{detail}あなたも試してみて。",
    "【{hook}】{theme}の習慣。{detail}続けることで見えてくるもの。",
  ],
  knowledge: [
    "{theme}の真実。{detail}学校では教えてくれない話。",
    "【{hook}】{theme}について深く考えたことある？{detail}",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildHook(mood?: string): string {
  const category = mood === "shock"
    ? "shock"
    : mood === "question"
    ? "question"
    : pickRandom(Object.keys(HOOKS) as Array<keyof typeof HOOKS>);
  return pickRandom(HOOKS[category as keyof typeof HOOKS]);
}

function applyPatterns(content: string, patterns: PatternHint[]): string {
  if (!patterns.length) return content;
  const heavy = patterns
    .filter((p) => p.weight > 1.5)
    .map((p) => p.pattern)
    .join("、");
  if (heavy) return content + `\n\n${heavy}`;
  return content;
}

export function generatePost(input: GenerateInput): GeneratedPost[] {
  const templates = GENRE_TEMPLATES[input.genre] ?? GENRE_TEMPLATES.knowledge;
  const maxLen = LENGTHS[input.length ?? "medium"];
  const results: GeneratedPost[] = [];

  for (let i = 0; i < 3; i++) {
    const template = pickRandom(templates);
    const hook = buildHook(input.mood);
    let content = template
      .replace("{hook}", hook)
      .replace("{theme}", input.theme)
      .replace("{detail}", input.examples ? pickRandom(input.examples) : "詳細は追記予定。");

    if (input.patterns?.length) {
      content = applyPatterns(content, input.patterns);
    }

    if (content.length > maxLen) {
      content = content.slice(0, maxLen - 1) + "…";
    }

    const score = 0.5 + Math.random() * 0.4 + (input.patterns?.reduce((s, p) => s + p.weight * 0.05, 0) ?? 0);

    results.push({
      content,
      score: Math.min(score, 1),
      tags: [input.genre, input.theme.split(" ")[0]],
      imagePromptHint: `${input.theme}, ${input.genre} style, dramatic lighting`,
      videoPromptHint: `Short clip: ${input.theme}, cinematic, ${input.mood ?? "mysterious"} mood`,
    });
  }

  return results;
}
