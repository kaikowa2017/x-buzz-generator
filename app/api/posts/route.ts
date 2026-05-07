import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const genreId = searchParams.get("genreId");
  const status = searchParams.get("status");

  const posts = await prisma.post.findMany({
    where: {
      ...(accountId ? { accountId } : {}),
      ...(genreId ? { genreId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      account: { select: { name: true, handle: true } },
      genre: { select: { name: true } },
      metrics: { orderBy: { recordedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { accountId, genreId, content, imagePrompt, videoPrompt, status, score, postType, usedPatterns } = body;
  if (!accountId || !content) return NextResponse.json({ error: "accountId と content は必須です" }, { status: 400 });

  const post = await prisma.post.create({
    data: {
      accountId,
      genreId,
      content,
      imagePrompt,
      videoPrompt,
      status: status ?? "draft",
      score,
      postType: postType ?? null,
      usedPatterns: usedPatterns ? JSON.stringify(usedPatterns) : null,
    },
  });
  return NextResponse.json(post, { status: 201 });
}
