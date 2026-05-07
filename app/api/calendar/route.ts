import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year      = parseInt(searchParams.get("year")  ?? String(new Date().getFullYear()));
  const month     = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const accountId = searchParams.get("accountId") || undefined;

  const from = new Date(year, month - 1, 1);
  const to   = new Date(year, month, 0, 23, 59, 59, 999);

  const posts = await prisma.post.findMany({
    where: {
      ...(accountId ? { accountId } : {}),
      createdAt: { gte: from, lte: to },
    },
    select: {
      id:         true,
      content:    true,
      postType:   true,
      status:     true,
      isTemplate: true,
      createdAt:  true,
      postedAt:   true,
      genre:      { select: { name: true } },
      account:    { select: { name: true } },
      metrics:    { orderBy: { recordedAt: "desc" }, take: 1,
                    select: { likes: true, impressions: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(posts);
}
