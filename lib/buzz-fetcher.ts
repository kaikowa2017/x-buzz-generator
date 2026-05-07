export type BuzzAnalysis = {
  content: string;
  likes: number;
  retweets: number;
  replies: number;
  patterns: string[];
  tags: string[];
  summary: string;
};

const HOOK_PATTERNS = [
  { re: /^なぜ|^どうして/, label: "疑問フック" },
  { re: /^【/, label: "強調ブラケット" },
  { re: /^\d+つ|\d+個/, label: "数字リスト" },
  { re: /実話|本当の話/, label: "実話フック" },
  { re: /知らない|気づかない/, label: "情報ギャップ" },
  { re: /\n.*\n/, label: "段落構成" },
  { re: /！{2,}|？{2,}/, label: "感情強調" },
];

function extractPatternsFromText(text: string): string[] {
  return HOOK_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
}

function extractTags(text: string): string[] {
  const hashtags = text.match(/#[\w぀-鿿]+/g) ?? [];
  return hashtags.slice(0, 5);
}

export async function analyzeBuzzUrl(url: string): Promise<BuzzAnalysis> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();

    const ogDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i)?.[1] ?? "";
    const twitterDesc = html.match(/<meta[^>]*name="twitter:description"[^>]*content="([^"]+)"/i)?.[1] ?? "";
    const content = ogDesc || twitterDesc || "コンテンツを取得できませんでした";

    const patterns = extractPatternsFromText(content);
    const tags = extractTags(content);
    const summary = buildSummary(content, patterns);

    return {
      content,
      likes: 0,
      retweets: 0,
      replies: 0,
      patterns,
      tags,
      summary,
    };
  } catch {
    return {
      content: "URLからコンテンツを取得できませんでした",
      likes: 0,
      retweets: 0,
      replies: 0,
      patterns: [],
      tags: [],
      summary: "取得に失敗しました。手動でコンテンツを入力してください。",
    };
  }
}

function buildSummary(content: string, patterns: string[]): string {
  if (!patterns.length) return `「${content.slice(0, 30)}...」— 特定のフックパターンは検出されませんでした。`;
  return `検出パターン: ${patterns.join("、")}。このような構造がバズに貢献した可能性があります。`;
}

export function analyzeManualBuzz(content: string): Omit<BuzzAnalysis, "likes" | "retweets" | "replies"> {
  return {
    content,
    patterns: extractPatternsFromText(content),
    tags: extractTags(content),
    summary: buildSummary(content, extractPatternsFromText(content)),
  };
}
