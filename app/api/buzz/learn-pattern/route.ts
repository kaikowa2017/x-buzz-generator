import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const WEIGHT_BOOST = 0.1;
const WEIGHT_MAX   = 3.0;

function round1(v: number) {
  return Math.round(v * 10) / 10;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { patternName, accountId } = body as {
    patternName: string;
    accountId?: string;
  };

  if (!patternName) {
    return NextResponse.json({ error: "patternName は必須" }, { status: 400 });
  }

  // patternName を含む LearningPattern を検索（部分一致）
  const existing = await prisma.learningPattern.findFirst({
    where: {
      pattern: { contains: patternName },
      ...(accountId ? { accountId } : {}),
    },
    orderBy: { weight: "desc" },
  });

  if (existing) {
    const newWeight = round1(Math.min(existing.weight + WEIGHT_BOOST, WEIGHT_MAX));
    const updated = await prisma.learningPattern.update({
      where: { id: existing.id },
      data: { weight: newWeight },
    });
    return NextResponse.json({
      action: "updated",
      pattern: updated.pattern,
      oldWeight: existing.weight,
      newWeight: updated.weight,
    });
  }

  // 既存パターンがなければ新規作成（バズ分析由来）
  const id = `${accountId ?? "global"}_${patternName}`.slice(0, 25);
  const created = await prisma.learningPattern.upsert({
    where: { id },
    update: { weight: round1(Math.min(1.0 + WEIGHT_BOOST, WEIGHT_MAX)) },
    create: {
      id,
      accountId: accountId ?? null,
      pattern: `${patternName}: バズ投稿から学習`,
      weight: round1(1.0 + WEIGHT_BOOST),
      source: "buzz",
      strongCount: 1,
      weakCount: 0,
    },
  });

  return NextResponse.json({
    action: "created",
    pattern: created.pattern,
    oldWeight: 1.0,
    newWeight: created.weight,
  });
}
