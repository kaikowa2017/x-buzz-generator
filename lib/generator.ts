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

const LENGTHS = {
  short: 80,
  medium: 160,
  long: 280,
};

const HOOKS = {
  horror: [
    "これ、気づいた瞬間に寒気がした。",
    "最初はただの偶然だと思ってた。",
    "今でも説明できない話。",
    "誰にも信じてもらえないと思う。",
  ],
  business: [
    "伸びる人は、最初にここを見てる。",
    "9割の人が順番を間違えてる。",
    "成果が出ない原因は、努力不足じゃない。",
    "結論、ここを変えるだけで変わる。",
  ],
  knowledge: [
    "実はこれ、かなり重要です。",
    "知らないと損する話。",
    "多くの人が勘違いしてます。",
    "これだけ覚えてください。",
  ],
};

const GENRE_TEMPLATES: Record<string, string[]> = {
  horror: [
    "{hook}\n\n{theme}\n\n{detail}\n\nでも一番怖いのは、まだ終わってない気がすること。",
    "{hook}\n\n{theme}について話します。\n\n{detail}\n\nあなたなら、どうしますか？",
  ],
  business: [
    "{hook}\n\n{theme}で大事なのは、才能ではなく設計です。\n\n{detail}\n\nまずは1つだけ変えてみてください。",
    "{hook}\n\n{theme}で結果を出す人の共通点。\n\n{detail}\n\n小さく試す人が一番強いです。",
  ],
  knowledge: [
    "{hook}\n\n{theme}について。\n\n{detail}\n\n知ってるだけで見え方が変わります。",
    "{hook}\n\n{theme}の本質はシンプルです。\n\n{detail}\n\nまずここから理解すると早いです。",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getGenre(inputGenre: string): "horror" | "business" | "knowledge" {
  if (inputGenre.includes("horror") || inputGenre.includes("怖")) return "horror";
  if (inputGenre.includes("business") || inputGenre.includes("ビジネス")) return "business";
  return "knowledge";
}

function buildDetail(input: GenerateInput): string {
  if (input.examples?.length) return pickRandom(input.examples);

  if (getGenre(input.genre) === "horror") {
    return "小さな違和感を無視したせいで、あとから全部つながって見えてきた。";
  }

  if (getGenre(input.genre) === "business") {
    return "最初にやるべきことは、作業量を増やすことではなく、勝ち筋を決めること。";
  }

  return "ポイントは、表面的なテクニックではなく、なぜそうなるのかを理解すること。";
}

function applyPatterns(content: string, patterns?: PatternHint[]): string {
  if (!patterns?.length) return content;

  const top = [...patterns]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((p) => p.pattern);

  if (!top.length) return content;

  return `${content}\n\n参考パターン：${top.join(" / ")}`;
}

export function generatePost(input: GenerateInput): GeneratedPost[] {
  const genre = getGenre(input.genre);
  const templates = GENRE_TEMPLATES[genre];
  const maxLen = LENGTHS[input.length ?? "medium"];

  const results: GeneratedPost[] = [];

  for (let i = 0; i < 3; i++) {
    const hook = pickRandom(HOOKS[genre]);
    const detail = buildDetail(input);
    const template = pickRandom(templates);

    let content = template
      .replaceAll("{hook}", hook)
      .replaceAll("{theme}", input.theme)
      .replaceAll("{detail}", detail);

    content = applyPatterns(content, input.patterns);

    if (content.length > maxLen) {
      content = content.slice(0, maxLen - 1) + "…";
    }

    const patternBonus =
      input.patterns?.reduce((sum, p) => sum + p.weight * 0.03, 0) ?? 0;

    results.push({
      content,
      score: Math.min(0.72 + Math.random() * 0.18 + patternBonus, 1),
      tags: [genre, input.theme],
      imagePromptHint: `${input.theme}, ${genre} style, dramatic lighting`,
      videoPromptHint: `Short vertical video about ${input.theme}, ${genre} mood, cinematic`,
    });
  }

  return results;
}