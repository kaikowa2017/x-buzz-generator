import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractPatterns } from "@/lib/learner";

export async function POST(req: Request) {
  const body = await req.json();
  const { accountId, genreId, source } = body;

  const metrics = await prisma.postMetric.findMany({
    where: accountId ? { accountId } : {},
    include: {
      post: { select: { content: true, genre: { select: { name: true } } } },
    },
    orderBy: { recordedAt: "desc" },
    take: 200,
  });

  const buzzPosts = await prisma.buzzPost.findMany({
    where: accountId ? { accountId } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const inputs = [
    ...metrics.map((m: any) => ({
      content: m.post.content,
      likes: m.likes,
      retweets: m.retweets,
      impressions: m.impressions,
      genre: m.post.genre?.name,
      source: "post" as const,
    })),
    ...buzzPosts.map((b: any) => ({
      content: b.content,
      likes: b.likes,
      retweets: b.retweets,
      impressions: 0,
      genre: undefined,
      source: "buzz" as const,
    })),
  ];

  const extracted = extractPatterns(inputs);

  await prisma.$transaction(
    extracted.map((p) =>
      prisma.learningPattern.upsert({
        where: {
          id: `${accountId ?? "global"}_${p.pattern}`.slice(0, 25),
        },
        update: { weight: p.weight, examples: JSON.stringify(p.examples) },
        create: {
          id: `${accountId ?? "global"}_${p.pattern}`.slice(0, 25),
          accountId: accountId ?? null,
          genreId: genreId ?? null,
          pattern: p.pattern,
          weight: p.weight,
          source: source ?? p.source,
          examples: JSON.stringify(p.examples),
        },
      })
    )
  );

  return NextResponse.json({ learned: extracted.length, patterns: extracted });
}
