import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  computePatternLifecycle,
  detectDrift,
  suggestNextPostType,
  autoAdjustWeights,
  buildInsights,
} from "@/lib/long-term-optimizer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId  = searchParams.get("accountId") ?? undefined;
  const doAdjust   = searchParams.get("autoAdjust") !== "false"; // default true

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 86400_000);

  // ── データ取得 ──────────────────────────────────────────────────
  const [patterns, rawMetrics] = await Promise.all([
    prisma.learningPattern.findMany({
      where: accountId ? { accountId } : {},
      orderBy: { weight: "desc" },
      take: 50,
    }),
    prisma.postMetric.findMany({
      where: {
        ...(accountId ? { accountId } : {}),
        recordedAt: { gte: since30 },
      },
      include: {
        post: {
          select: { usedPatterns: true, genre: { select: { name: true } }, postType: true },
        },
      },
      orderBy: { recordedAt: "asc" },
    }),
  ]);

  // ── PatternLifecycle 計算 ───────────────────────────────────────
  const metricRows = rawMetrics.map((m) => ({
    postId:         m.postId,
    engagementRate: m.engagementRate,
    impressions:    m.impressions,
    recordedAt:     m.recordedAt,
    usedPatterns:   m.post.usedPatterns,
  }));

  const lifecycles = computePatternLifecycle(
    patterns.map((p) => ({
      id: p.id, pattern: p.pattern, weight: p.weight,
      lifeScore: p.lifeScore, trend: p.trend,
    })),
    metricRows,
    now
  );

  const rising    = lifecycles.filter((l) => l.trend === "rising").sort((a, b) => b.lifeScore - a.lifeScore);
  const stable    = lifecycles.filter((l) => l.trend === "stable" && l.weight >= 1.5).sort((a, b) => b.weight - a.weight);
  const declining = lifecycles.filter((l) => l.trend === "declining").sort((a, b) => a.lifeScore - b.lifeScore);

  // ── ドリフト検出 ────────────────────────────────────────────────
  const postSummaries = rawMetrics.map((m) => ({
    genre:    m.post.genre?.name ?? null,
    postType: m.post.postType,
    recordedAt: m.recordedAt,
  }));
  const driftWarnings = detectDrift(postSummaries, now);

  // ── 次に優先すべき投稿タイプ ────────────────────────────────────
  const typeMetrics = rawMetrics.map((m) => ({
    postType:      m.post.postType,
    engagementRate: m.engagementRate,
    impressions:   m.impressions,
  }));
  const { postType: nextPriorityPostType, scores: postTypeScores } = suggestNextPostType(typeMetrics, now);

  // ── 自動 weight 調整 ────────────────────────────────────────────
  const adjustments = doAdjust ? autoAdjustWeights(lifecycles) : [];

  if (adjustments.length > 0) {
    await prisma.$transaction([
      ...adjustments.map((adj) =>
        prisma.learningPattern.update({
          where: { id: adj.id },
          data: { weight: adj.newWeight },
        })
      ),
      // lifeScore と trend を DB に同期
      ...lifecycles.map((lc) =>
        prisma.learningPattern.update({
          where: { id: lc.id },
          data: {
            lifeScore: lc.lifeScore,
            trend:     lc.trend,
          },
        })
      ),
    ]);
  } else {
    // lifeScore と trend だけ同期
    if (lifecycles.length > 0) {
      await prisma.$transaction(
        lifecycles.map((lc) =>
          prisma.learningPattern.update({
            where: { id: lc.id },
            data: { lifeScore: lc.lifeScore, trend: lc.trend },
          })
        )
      );
    }
  }

  // OptimizationLog に記録
  await prisma.optimizationLog.create({
    data: {
      accountId: accountId ?? null,
      insight:   buildInsights(rising, declining, driftWarnings, nextPriorityPostType)[0] ?? "長期最適化実行",
      period:    "30d",
      data:      JSON.stringify({
        rising:    rising.length,
        declining: declining.length,
        driftWarnings: driftWarnings.length,
        autoAdjusted:  adjustments.length,
      }),
    },
  });

  return NextResponse.json({
    risingPatterns:        rising,
    stablePatterns:        stable,
    decliningPatterns:     declining,
    driftWarnings,
    nextPriorityPostType,
    postTypeScores,
    insights:              buildInsights(rising, declining, driftWarnings, nextPriorityPostType),
    autoAdjusted:          adjustments,
  });
}
