export type Trend = "rising" | "stable" | "declining";

export type PatternLifecycle = {
  id: string;
  pattern: string;
  weight: number;
  lifeScore: number;
  trend: Trend;
  avgER7d: number | null;
  avgER30d: number | null;
  postCount7d: number;
  postCount30d: number;
};

export type DriftWarning = {
  type: "genre" | "postType";
  severity: "high" | "medium";
  message: string;
  detail: string;
};

export type LongTermResult = {
  risingPatterns:   PatternLifecycle[];
  stablePatterns:   PatternLifecycle[];
  decliningPatterns: PatternLifecycle[];
  driftWarnings:    DriftWarning[];
  nextPriorityPostType: string | null;
  postTypeScores:   Record<string, number>;
  insights:         string[];
  autoAdjusted:     { pattern: string; oldWeight: number; newWeight: number }[];
};

/* ------------------------------------------------------------------ */
/* Pattern lifecycle                                                    */
/* ------------------------------------------------------------------ */

type MetricRow = {
  postId: string;
  engagementRate: number | null;
  impressions: number;
  recordedAt: Date;
  usedPatterns: string | null;
};

function avgER(rows: MetricRow[]): number | null {
  const valid = rows.filter((r) => r.impressions > 0 && r.engagementRate != null);
  if (!valid.length) return null;
  return valid.reduce((s, r) => s + (r.engagementRate ?? 0), 0) / valid.length;
}

type RawPattern = { id: string; pattern: string; weight: number; lifeScore: number; trend: string };

export function computePatternLifecycle(
  patterns: RawPattern[],
  metrics: MetricRow[],
  now: Date
): PatternLifecycle[] {
  const d7  = new Date(now.getTime() - 7  * 86400_000);
  const d30 = new Date(now.getTime() - 30 * 86400_000);

  return patterns.map((pat) => {
    // パターン名のプレフィックスで投稿を絞り込み
    const prefix = pat.pattern.split(/[：:]/)[0].trim().slice(0, 8);

    const matched30 = metrics.filter(
      (m) => new Date(m.recordedAt) >= d30 &&
        m.usedPatterns != null && (() => {
          try { return (JSON.parse(m.usedPatterns!) as string[]).some((p) => p.includes(prefix)); }
          catch { return false; }
        })()
    );
    const matched7 = matched30.filter((m) => new Date(m.recordedAt) >= d7);

    const er30 = avgER(matched30);
    const er7  = avgER(matched7);

    let lifeScore: number;
    let trend: Trend;

    if (er30 != null && er30 > 0 && er7 != null) {
      lifeScore = Math.round((er7 / er30) * 100) / 100;
      trend = lifeScore >= 1.15 ? "rising" : lifeScore <= 0.75 ? "declining" : "stable";
    } else if (er30 != null && er7 == null && matched30.length >= 2) {
      // 30d実績あり、7d実績なし → 最近使われていない = declining
      lifeScore = 0.5;
      trend = "declining";
    } else {
      // データ不足 → weightベースで推定
      lifeScore = pat.weight >= 1.5 ? 1.0 : pat.weight < 0.8 ? 0.6 : 0.8;
      trend = pat.weight >= 1.5 ? "stable" : pat.weight < 0.8 ? "declining" : "stable";
    }

    return {
      id: pat.id,
      pattern: pat.pattern,
      weight: pat.weight,
      lifeScore,
      trend,
      avgER7d:      er7  != null ? Math.round(er7  * 1000) / 1000 : null,
      avgER30d:     er30 != null ? Math.round(er30 * 1000) / 1000 : null,
      postCount7d:  matched7.length,
      postCount30d: matched30.length,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Drift detection                                                      */
/* ------------------------------------------------------------------ */

type PostSummary = {
  genre:    string | null;
  postType: string | null;
  recordedAt: Date;
};

function distribution(posts: PostSummary[], key: "genre" | "postType"): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of posts) {
    const v = p[key] ?? "不明";
    counts[v] = (counts[v] ?? 0) + 1;
  }
  return counts;
}

function topKey(dist: Record<string, number>): [string, number] {
  const entries = Object.entries(dist);
  if (!entries.length) return ["不明", 0];
  entries.sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return [entries[0][0], entries[0][1] / total];
}

export function detectDrift(posts: PostSummary[], now: Date): DriftWarning[] {
  const d7  = new Date(now.getTime() - 7  * 86400_000);
  const d30 = new Date(now.getTime() - 30 * 86400_000);

  const recent   = posts.filter((p) => new Date(p.recordedAt) >= d7);
  const historic = posts.filter((p) => new Date(p.recordedAt) >= d30);

  if (recent.length < 3) return [];

  const warnings: DriftWarning[] = [];

  for (const key of ["genre", "postType"] as const) {
    const label = key === "genre" ? "ジャンル" : "投稿タイプ";

    const recentDist   = distribution(recent,   key);
    const historicDist = distribution(historic, key);

    const [topRecent,   topRecentRate]   = topKey(recentDist);
    const [topHistoric, topHistoricRate] = topKey(historicDist);

    // 集中度が高すぎる (7d で 75%以上が同一)
    if (topRecentRate >= 0.75 && Object.keys(recentDist).length > 1) {
      warnings.push({
        type: key,
        severity: "high",
        message: `${label}が「${topRecent}」に偏りすぎています（${Math.round(topRecentRate * 100)}%）`,
        detail: "多様性を持たせることでリーチを広げられます。別のジャンル・タイプを試してみましょう。",
      });
    }

    // 7d と 30d で支配的なカテゴリが変わった
    if (topRecent !== topHistoric && topRecentRate >= 0.5 && topHistoricRate >= 0.4) {
      warnings.push({
        type: key,
        severity: "medium",
        message: `${label}が「${topHistoric}」→「${topRecent}」にシフトしています`,
        detail: "意図的な変更なら問題ありませんが、過去の強いパターンが失われていないか確認しましょう。",
      });
    }
  }

  return warnings;
}

/* ------------------------------------------------------------------ */
/* Next priority post type                                              */
/* ------------------------------------------------------------------ */

type PostTypeMetric = {
  postType: string | null;
  engagementRate: number | null;
  impressions: number;
};

export function suggestNextPostType(
  metrics: PostTypeMetric[],
  now: Date
): { postType: string | null; scores: Record<string, number> } {
  const d30 = new Date(now.getTime() - 30 * 86400_000);
  const recent = metrics.filter((m) => m.impressions > 0 && m.engagementRate != null);

  const scoreMap: Record<string, number[]> = {};
  for (const m of recent) {
    const t = m.postType ?? "不明";
    if (!scoreMap[t]) scoreMap[t] = [];
    scoreMap[t].push(m.engagementRate ?? 0);
  }

  const avgScores: Record<string, number> = {};
  for (const [t, ers] of Object.entries(scoreMap)) {
    avgScores[t] = Math.round((ers.reduce((s, v) => s + v, 0) / ers.length) * 100) / 100;
  }

  const best = Object.entries(avgScores).sort((a, b) => b[1] - a[1])[0];
  return { postType: best?.[0] ?? null, scores: avgScores };
}

/* ------------------------------------------------------------------ */
/* Auto weight adjustment based on lifecycle                           */
/* ------------------------------------------------------------------ */

const RISE_BOOST  = +0.1;
const FALL_PENALTY = -0.15;
const W_MIN = 0.1;
const W_MAX = 3.0;

export function autoAdjustWeights(
  lifecycles: PatternLifecycle[]
): { id: string; pattern: string; oldWeight: number; newWeight: number }[] {
  const adjusted: ReturnType<typeof autoAdjustWeights> = [];

  for (const lc of lifecycles) {
    if (lc.postCount30d < 2) continue; // データ不足はスキップ

    let newWeight = lc.weight;
    if (lc.trend === "rising"   && lc.weight < 2.5) newWeight = Math.min(W_MAX, lc.weight + RISE_BOOST);
    if (lc.trend === "declining" && lc.weight > 0.3) newWeight = Math.max(W_MIN, lc.weight + FALL_PENALTY);

    newWeight = Math.round(newWeight * 10) / 10;
    if (Math.abs(newWeight - lc.weight) >= 0.05) {
      adjusted.push({ id: lc.id, pattern: lc.pattern, oldWeight: lc.weight, newWeight });
    }
  }

  return adjusted;
}

/* ------------------------------------------------------------------ */
/* Insights text                                                        */
/* ------------------------------------------------------------------ */

export function buildInsights(
  rising: PatternLifecycle[],
  declining: PatternLifecycle[],
  drift: DriftWarning[],
  nextType: string | null
): string[] {
  const insights: string[] = [];

  if (rising.length > 0) {
    insights.push(`「${rising[0].pattern.split(/[：:]/)[0]}」が上昇中です。このパターンを積極的に活用しましょう。`);
  }
  if (declining.length > 0) {
    insights.push(`「${declining[0].pattern.split(/[：:]/)[0]}」の効果が低下しています。フックの言葉を変えて試してみましょう。`);
  }
  if (drift.length > 0) {
    insights.push(`投稿の${drift[0].type === "genre" ? "ジャンル" : "タイプ"}が偏っています。多様性を意識すると新しい読者層を獲得できます。`);
  }
  if (nextType && !["不明", "null"].includes(nextType)) {
    insights.push(`「${nextType}」投稿のERが高い傾向があります。次の投稿はこのタイプで試してみましょう。`);
  }
  if (insights.length === 0) {
    insights.push("データを蓄積してより詳細な分析を行いましょう。投稿後に数値を入力することで精度が上がります。");
  }

  return insights;
}
