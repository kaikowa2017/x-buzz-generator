export type OptimizationInput = {
  metrics: Array<{
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
    bookmarks: number;
    createdAt: Date;
    genre?: string;
  }>;
  patterns: Array<{
    pattern: string;
    weight: number;
  }>;
  period: "week" | "month" | "quarter";
};

export type OptimizationOutput = {
  suggestions: Suggestion[];
  scorecard: Scorecard;
  nextActions: string[];
};

export type Suggestion = {
  category: "timing" | "content" | "engagement" | "growth";
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
};

export type Scorecard = {
  avgER: number;
  trend: string;
  consistency: number;
  topPattern: string | null;
};

function er(m: { likes: number; retweets: number; impressions: number; bookmarks: number }): number {
  if (!m.impressions) return 0;
  return ((m.likes + m.retweets * 2 + m.bookmarks * 2) / m.impressions) * 100;
}

export function optimize(input: OptimizationInput): OptimizationOutput {
  const { metrics, patterns } = input;
  const suggestions: Suggestion[] = [];
  const nextActions: string[] = [];

  if (!metrics.length) {
    return {
      suggestions: [{ category: "content", priority: "high", title: "データ不足", detail: "投稿を増やして数値を入力してください。" }],
      scorecard: { avgER: 0, trend: "データなし", consistency: 0, topPattern: null },
      nextActions: ["投稿して数値を入力する", "バズ投稿を分析して学習させる"],
    };
  }

  const rates = metrics.map((m) => er(m));
  const avgER = rates.reduce((s, r) => s + r, 0) / rates.length;

  const sorted = [...metrics].sort((a, b) => er(b) - er(a));
  const topHours: Record<number, number[]> = {};
  for (const m of metrics) {
    const h = new Date(m.createdAt).getHours();
    if (!topHours[h]) topHours[h] = [];
    topHours[h].push(er(m));
  }
  const bestHourEntry = Object.entries(topHours)
    .map(([h, ers]) => ({ h: Number(h), avg: ers.reduce((s, e) => s + e, 0) / ers.length }))
    .sort((a, b) => b.avg - a.avg)[0];

  if (bestHourEntry) {
    suggestions.push({
      category: "timing",
      priority: "high",
      title: `最適投稿時間: ${bestHourEntry.h}時台`,
      detail: `${bestHourEntry.h}時台の投稿が平均ER ${bestHourEntry.avg.toFixed(2)}%と最も高い結果です。`,
    });
    nextActions.push(`${bestHourEntry.h}時台に投稿をスケジュールする`);
  }

  if (avgER < 2) {
    suggestions.push({
      category: "engagement",
      priority: "high",
      title: "エンゲージメント率が低い",
      detail: "フックを強化し、疑問形や数字リストを取り入れましょう。",
    });
    nextActions.push("フックパターンを学習から追加して再生成する");
  }

  const topPattern = patterns.sort((a, b) => b.weight - a.weight)[0];
  if (topPattern) {
    suggestions.push({
      category: "content",
      priority: "medium",
      title: `効果的パターン: ${topPattern.pattern}`,
      detail: `重み${topPattern.weight}のパターンが高エンゲージメントと相関しています。このパターンを継続使用しましょう。`,
    });
  }

  const postDates = metrics.map((m) => new Date(m.createdAt).toDateString());
  const uniqueDays = new Set(postDates).size;
  const periodDays = input.period === "week" ? 7 : input.period === "month" ? 30 : 90;
  const consistency = Math.min((uniqueDays / periodDays) * 100, 100);

  if (consistency < 50) {
    suggestions.push({
      category: "growth",
      priority: "medium",
      title: "投稿頻度を上げる",
      detail: `分析期間中の投稿日数: ${uniqueDays}日。毎日投稿でアカウント成長が加速します。`,
    });
    nextActions.push("毎日1〜3投稿を目標にする");
  }

  const recentAvg = rates.slice(-3).reduce((s, r) => s + r, 0) / (Math.min(3, rates.length) || 1);
  const trend = recentAvg > avgER * 1.1 ? "上昇中" : recentAvg < avgER * 0.9 ? "下降中" : "安定";

  return {
    suggestions,
    scorecard: {
      avgER: Number(avgER.toFixed(2)),
      trend,
      consistency: Math.round(consistency),
      topPattern: topPattern?.pattern ?? null,
    },
    nextActions,
  };
}
