import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [patterns, postCount] = await Promise.all([
    prisma.learningPattern.findMany({
      where: { accountId: id },
      orderBy: { weight: "desc" },
      take: 20,
      select: { pattern: true, weight: true, strongCount: true, weakCount: true, trend: true, lifeScore: true },
    }),
    prisma.post.count({ where: { accountId: id } }),
  ]);

  return NextResponse.json({ patterns, postCount });
}
