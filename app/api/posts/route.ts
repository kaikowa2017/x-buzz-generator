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

async function learnPatterns(accountId: string, genreId: string | null, patterns: string[], score?: number) {
  if (!patterns.length) return;

  const isStrong = typeof score === "number" ? score >= 0.7 : true;

  for (const pattern of patterns) {
    await prisma.learningPattern.upsert({
      where: {
        id: `${accountId}_${pattern}`.slice(0, 24),
      },
      update: {
        weight: { increment: isStrong ? 0.15 : -0.1 },
        strongCount: { increment: isStrong ? 1 : 0 },
        weakCount: { increment: isStrong ? 0 : 1 },
      },
      create: {
        id: `${accountId}_${pattern}`.slice(0, 24),
        accountId,
        genreId,
        pattern,
        weight: isStrong ? 1.2 : 0.8,
        source: "saved_post",
        strongCount: isStrong ? 1 : 0,
        weakCount: isStrong ? 0 : 1,
      },
    });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    accountId,
    genreId,
    content,
    imagePrompt,
    videoPrompt,
    status,
    score,
    postType,
    usedPatterns,
  } = body;

  if (!accountId || !content) {
    return NextResponse.json(
      { error: "accountId と content は必須です" },
      { status: 400 }
    );
  }

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

  if (Array.isArray(usedPatterns)) {
    await learnPatterns(accountId, genreId ?? null, usedPatterns, score);
  }

  return NextResponse.json(post, { status: 201 });
}