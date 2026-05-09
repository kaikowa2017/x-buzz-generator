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

const LENGTHS = { short: 90, medium: 180, long: 320 };

const HOOKS = {
  horror: ["これ、気づいた瞬間に寒気がした。", "最初はただの偶然だと思ってた。", "今でも説明できない話。"],
  business: ["伸びる人は、最初にここを見てる。", "9割の人が順番を間違えてる。", "成果が出ない原因は、努力不足じゃない。"],
  knowledge: ["実はこれ、かなり重要です。", "知らないと損する話。", "多くの人が勘違いしてます。"],
};

const TEMPLATES = {
  horror: [
    "{hook}\n\n{theme}\n\n{detail}\n\nでも一番怖いのは、まだ終わってない気がすること。",
    "{hook}\n\n{theme}の話。\n\n{detail}\n\nあなたなら、気づけますか？",
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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getGenre(genre: string): keyof typeof TEMPLATES {
  if (/horror|ホラー|怪談|怖|恐怖/.test(genre)) return "horror";
  if (/business|ビジネス|副業|仕事|起業/.test(genre)) return "business";
  return "knowledge";
}

function buildDetail(input: GenerateInput, genre: keyof typeof TEMPLATES): string {
  if (input.examples?.length) return pick(input.examples);

  if (genre === "horror") return "小さな違和感を無視したせいで、あとから全部つながって見えてきた。";
  if (genre === "business") return "作業量を増やす前に、誰に何を届けるかを決めること。";
  return "表面的なテクニックより、なぜそうなるのかを理解すること。";
}

function applyStyle(content: string, style?: string): string {
  if (!style) return content;

  if (style.includes("短文")) {
    return content.split("\n").filter(Boolean).slice(0, 5).join("\n\n");
  }

  if (style.includes("カジュアル")) {
    return content.replaceAll("です。", "です。").replaceAll("ます。", "ます。");
  }

  if (style.includes("冷静") || style.includes("論理")) {
    return content + "\n\n要するに、感覚ではなく構造を見ることが大事です。";
  }

  return content;
}

function applyPatterns(content: string, patterns?: PatternHint[]): string {
  if (!patterns?.length) return content;

  const strong = [...patterns]
    .filter((p) => !p.pattern.startsWith("NGワード禁止"))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((p) => p.pattern);

  if (!strong.length) return content;
  return `${content}\n\n${strong.join("\n")}`;
}

function applyNgWords(content: string, patterns?: PatternHint[]): string {
  const ng = patterns
    ?.filter((p) => p.pattern.startsWith("NGワード禁止"))
    .flatMap((p) => p.pattern.replace("NGワード禁止:", "").split("、").map((w) => w.trim()))
    .filter(Boolean) ?? [];

  let result = content;
  for (const word of ng) {
    result = result.replaceAll(word, "○○");
  }
  return result;
}

export function generatePost(input: GenerateInput): GeneratedPost[] {
  const genre = getGenre(input.genre);
  const maxLen = LENGTHS[input.length ?? "medium"];
  const results: GeneratedPost[] = [];

  for (let i = 0; i < 3; i++) {
    const hook = pick(HOOKS[genre]);
    const detail = buildDetail(input, genre);
    const template = pick(TEMPLATES[genre]);

    let content = template
      .replaceAll("{hook}", hook)
      .replaceAll("{theme}", input.theme)
      .replaceAll("{detail}", detail);

    content = applyPatterns(content, input.patterns);
    content = applyStyle(content, input.style);
    content = applyNgWords(content, input.patterns);

    if (content.length > maxLen) {
      content = content.slice(0, maxLen - 1) + "…";
    }

    const patternBonus = input.patterns?.reduce((s, p) => s + p.weight * 0.025, 0) ?? 0;

    results.push({
      content,
      score: Math.min(0.7 + Math.random() * 0.2 + patternBonus, 1),
      tags: [genre, input.theme],
      imagePromptHint: `${input.theme}, ${genre} style, dramatic lighting`,
      videoPromptHint: `Short vertical video about ${input.theme}, ${genre} mood, cinematic`,
    });
  }

  return results;
}