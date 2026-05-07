import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyze } from "@/lib/analyzer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");

  const metrics = await prisma.postMetric.findMany({
    where: accountId ? { accountId } : {},
    include: {
      post: { select: { content: true, genre: { select: { name: true } } } },
    },
    orderBy: { recordedAt: "asc" },
    take: 500,
  });

  const records = metrics.map((m) => ({
    postId: m.postId,
    content: m.post.content,
    likes: m.likes,
    retweets: m.retweets,
    replies: m.replies,
    impressions: m.impressions,
    bookmarks: m.bookmarks,
    createdAt: m.recordedAt,
    genre: m.post.genre?.name,
  }));

  const result = analyze(records);
  return NextResponse.json(result);
}
