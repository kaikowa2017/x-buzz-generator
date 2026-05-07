import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { likes, retweets, replies, impressions, bookmarks } = body;

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const er = impressions > 0
    ? ((likes + retweets * 2 + replies * 1.5 + bookmarks * 2) / impressions) * 100
    : 0;

  const metric = await prisma.postMetric.create({
    data: {
      postId: id,
      accountId: post.accountId,
      likes: likes ?? 0,
      retweets: retweets ?? 0,
      replies: replies ?? 0,
      impressions: impressions ?? 0,
      bookmarks: bookmarks ?? 0,
      engagementRate: Number(er.toFixed(4)),
    },
  });
  return NextResponse.json(metric, { status: 201 });
}
