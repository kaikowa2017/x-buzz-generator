export type MetricRecord = {
  postId: string;
  content: string;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  bookmarks: number;
  createdAt: Date;
  genre?: string;
};

export type AnalyticsResult = {
  totalPosts: number;
  avgEngagementRate: number;
  topPost: MetricRecord | null;
  engagementTrend: "up" | "down" | "flat";
  bestGenre: string | null;
  bestHour: number | null;
  insights: string[];
};

function engagementRate(m: MetricRecord): number {
  if (!m.impressions) return 0;
  return ((m.likes + m.retweets * 2 + m.replies * 1.5 + m.bookmarks * 2) / m.impressions) * 100;
}

export function analyze(records: MetricRecord[]): AnalyticsResult {
  if (!records.length) {
    return {
      totalPosts: 0,
      avgEngagementRate: 0,
      topPost: null,
      engagementTrend: "flat",
      bestGenre: null,
      bestHour: null,
      insights: ["データがありません。投稿後に数値を入力してください。"],
    };
  }

  const rates = records.map((r) => ({ ...r, er: engagementRate(r) }));
  const avgER = rates.reduce((s, r) => s + r.er, 0) / rates.length;
  const topPost = rates.sort((a, b) => b.er - a.er)[0];

  const half = Math.floor(records.length / 2);
  const firstHalf = rates.slice(0, half);
  const secondHalf = rates.slice(half);
  const firstAvg = firstHalf.reduce((s, r) => s + r.er, 0) / (firstHalf.length || 1);
  const secondAvg = secondHalf.reduce((s, r) => s + r.er, 0) / (secondHalf.length || 1);
  const trend: "up" | "down" | "flat" =
    secondAvg > firstAvg * 1.1 ? "up" : secondAvg < firstAvg * 0.9 ? "down" : "flat";

  const genreMap: Record<string, number[]> = {};
  for (const r of rates) {
    const g = r.genre ?? "不明";
    if (!genreMap[g]) genreMap[g] = [];
    genreMap[g].push(r.er);
  }
  const bestGenre = Object.entries(genreMap)
    .map(([g, ers]) => ({ g, avg: ers.reduce((s, e) => s + e, 0) / ers.length }))
    .sort((a, b) => b.avg - a.avg)[0]?.g ?? null;

  const hourMap: Record<number, number[]> = {};
  for (const r of rates) {
    const h = new Date(r.createdAt).getHours();
    if (!hourMap[h]) hourMap[h] = [];
    hourMap[h].push(r.er);
  }
  const bestHour = Object.entries(hourMap)
    .map(([h, ers]) => ({ h: Number(h), avg: ers.reduce((s, e) => s + e, 0) / ers.length }))
    .sort((a, b) => b.avg - a.avg)[0]?.h ?? null;

  const insights: string[] = [];
  if (trend === "up") insights.push("エンゲージメントが上昇傾向です。今のスタイルを継続しましょう。");
  if (trend === "down") insights.push("エンゲージメントが低下傾向です。フックや構成を見直しましょう。");
  if (avgER < 1) insights.push("平均エンゲージメント率が1%未満です。インプレッション数を増やす工夫が必要です。");
  if (avgER > 5) insights.push("高エンゲージメント率を維持しています。パターンを学習に追加しましょう。");
  if (bestHour !== null) insights.push(`${bestHour}時台の投稿が最も反応が良い傾向です。`);

  return {
    totalPosts: records.length,
    avgEngagementRate: Number(avgER.toFixed(2)),
    topPost,
    engagementTrend: trend,
    bestGenre,
    bestHour,
    insights,
  };
}
