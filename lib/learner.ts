export type LearnInput = {
  content: string;
  likes: number;
  retweets: number;
  impressions: number;
  genre?: string;
  source: "post" | "buzz";
};

export type ExtractedPattern = {
  pattern: string;
  weight: number;
  source: string;
  examples: string[];
};

export const HOOK_PATTERNS = [
  { re: /^なぜ|^どうして/, label: "疑問フック: 「なぜ〜？」で始まる" },
  { re: /^【/, label: "強調ブラケット: 【〜】で始まる" },
  { re: /^\d+つ|\d+個/, label: "数字フック: 数字+リスト" },
  { re: /実話|本当の話|実際に/, label: "実話フック: リアル体験を強調" },
  { re: /知らない|気づかない/, label: "情報ギャップフック: 「知らない」を使う" },
  { re: /無料|今すぐ|すぐ使える/, label: "即時価値フック: 即効性を強調" },
  { re: /\n/, label: "改行あり: 読みやすい段落構成" },
];

function calcWeight(likes: number, retweets: number, impressions: number): number {
  const er = impressions > 0 ? ((likes + retweets * 2) / impressions) * 100 : 0;
  if (er > 10) return 3.0;
  if (er > 5) return 2.0;
  if (er > 2) return 1.5;
  return 1.0;
}

export function extractPatterns(inputs: LearnInput[]): ExtractedPattern[] {
  const patternMap: Record<string, { weight: number; examples: string[]; source: string }> = {};

  for (const input of inputs) {
    const weight = calcWeight(input.likes, input.retweets, input.impressions);
    if (weight < 1.5) continue;

    for (const { re, label } of HOOK_PATTERNS) {
      if (re.test(input.content)) {
        if (!patternMap[label]) {
          patternMap[label] = { weight: 0, examples: [], source: input.source };
        }
        patternMap[label].weight = Math.max(patternMap[label].weight, weight);
        if (patternMap[label].examples.length < 3) {
          patternMap[label].examples.push(input.content.slice(0, 60));
        }
      }
    }

    if (input.content.length < 80) {
      const label = "短文投稿: 80文字以内のコンパクトな投稿";
      if (!patternMap[label]) patternMap[label] = { weight: 0, examples: [], source: input.source };
      patternMap[label].weight = Math.max(patternMap[label].weight, weight);
      if (patternMap[label].examples.length < 3) {
        patternMap[label].examples.push(input.content.slice(0, 60));
      }
    }
  }

  return Object.entries(patternMap).map(([pattern, v]) => ({
    pattern,
    weight: Number(v.weight.toFixed(1)),
    source: v.source,
    examples: v.examples,
  }));
}
