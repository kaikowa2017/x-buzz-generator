import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { optimize } from "@/lib/optimizer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const period = (searchParams.get("period") ?? "month") as "week" | "month" | "quarter";

  const days = period === "week" ? 7 : period === "month" ? 30 : 90;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [metrics, patterns] = await Promise.all([
    prisma.postMetric.findMany({
      where: {
        ...(accountId ? { accountId } : {}),
        recordedAt: { gte: since },
      },
      include: { post: { select: { genre: { select: { name: true } } } } },
      orderBy: { recordedAt: "asc" },
    }),
    prisma.learningPattern.findMany({
      where: accountId ? { accountId } : {},
      orderBy: { weight: "desc" },
      take: 20,
    }),
  ]);

  const result = optimize({
    metrics: metrics.map((m) => ({
      likes: m.likes,
      retweets: m.retweets,
      replies: m.replies,
      impressions: m.impressions,
      bookmarks: m.bookmarks,
      createdAt: m.recordedAt,
      genre: m.post.genre?.name,
    })),
    patterns: patterns.map((p) => ({ pattern: p.pattern, weight: p.weight })),
    period,
  });

  await prisma.optimizationLog.create({
    data: {
      accountId,
      insight: result.suggestions[0]?.title ?? "分析完了",
      period,
      data: JSON.stringify(result.scorecard),
    },
  });

  return NextResponse.json(result);
}
