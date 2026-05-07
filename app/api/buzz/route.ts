import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");

  const posts = await prisma.buzzPost.findMany({
    where: accountId ? { accountId } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { url, content, accountId, likes, retweets, replies, analysis, patterns, tags, source } = body;
  if (!content) return NextResponse.json({ error: "content は必須です" }, { status: 400 });

  const post = await prisma.buzzPost.create({
    data: {
      url,
      content,
      accountId,
      likes: likes ?? 0,
      retweets: retweets ?? 0,
      replies: replies ?? 0,
      analysis,
      patterns: patterns ? JSON.stringify(patterns) : null,
      tags: tags ? JSON.stringify(tags) : null,
      source: source ?? "manual",
    },
  });
  return NextResponse.json(post, { status: 201 });
}
