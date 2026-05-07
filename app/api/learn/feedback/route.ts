import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HOOK_PATTERNS } from "@/lib/learner";
import {
  applyLevelDelta,
  runAllChecks,
  type Level,
  type PatternRecord,
} from "@/lib/weight-adjuster";

function matchPatterns(content: string): string[] {
  const matched: string[] = [];
  for (const { re, label } of HOOK_PATTERNS) {
    if (re.test(content)) matched.push(label);
  }
  if (content.length < 80) matched.push("短文投稿: 80文字以内のコンパクトな投稿");
  return matched;
}

export async function POST(req: Request) {
  const body = await req.json();
  // level を優先。後方互換で strong: boolean も受け付ける
  const { postId, accountId } = body as { postId: string; accountId?: string };
  const level: Level = body.level ?? (body.strong === true ? "強い" : "弱い");

  if (!postId) {
    return NextResponse.json({ error: "postId は必須" }, { status: 400 });
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const resolvedAccountId = accountId ?? post.accountId;

  // ── マッチするパターンを特定 ──────────────────────────────────
  // 1. 投稿テキストから HOOK_PATTERNS でマッチ
  const fromContent = matchPatterns(post.content);

  // 2. 保存済み usedPatterns も追加（Claude生成時に記録された学習パターン）
  const fromSaved: string[] = [];
  if (post.usedPatterns) {
    try {
      const parsed = JSON.parse(post.usedPatterns) as string[];
      fromSaved.push(...parsed);
    } catch {}
  }

  // 重複排除
  const matchedLabels = Array.from(new Set([...fromContent, ...fromSaved]));

  if (matchedLabels.length === 0) {
    return NextResponse.json({ updated: [], adjustments: [], message: "マッチするパターンなし" });
  }

  // ── Step 1: パターンをupsert & 重み更新 ──────────────────────
  const dbPatterns = await Promise.all(
    matchedLabels.map((label) =>
      prisma.learningPattern.upsert({
        where: { id: `${resolvedAccountId}_${label}`.slice(0, 25) },
        update: {},
        create: {
          id: `${resolvedAccountId}_${label}`.slice(0, 25),
          accountId: resolvedAccountId,
          pattern: label,
          weight: 1.0,
          source: "feedback",
          strongCount: 0,
          weakCount: 0,
        },
      })
    )
  );

  const updatedPatterns: PatternRecord[] = [];
  for (const p of dbPatterns) {
    const newWeight = applyLevelDelta(p.weight, level);
    const updated = await prisma.learningPattern.update({
      where: { id: p.id },
      data: {
        weight: newWeight,
        // 普通はカウントを動かさない（強/弱の比率を汚染しない）
        strongCount: level === "強い" ? { increment: 1 } : undefined,
        weakCount:   level === "弱い" ? { increment: 1 } : undefined,
      },
    });
    updatedPatterns.push({
      id: updated.id,
      pattern: updated.pattern,
      weight: updated.weight,
      strongCount: updated.strongCount,
      weakCount: updated.weakCount,
    });
  }

  // ── Step 2: アカウント全パターンで三つの調整チェック ──────────
  const allPatterns = await prisma.learningPattern.findMany({
    where: { accountId: resolvedAccountId },
  });

  const allRecords: PatternRecord[] = allPatterns.map((p) => ({
    id: p.id,
    pattern: p.pattern,
    weight: p.weight,
    strongCount: p.strongCount,
    weakCount: p.weakCount,
  }));

  const adjustments = runAllChecks(allRecords);

  // ── Step 3: 調整をDB反映 ──────────────────────────────────────
  if (adjustments.length > 0) {
    await prisma.$transaction(
      adjustments.map((adj) =>
        prisma.learningPattern.update({
          where: { id: adj.id },
          data: { weight: adj.newWeight },
        })
      )
    );
  }

  return NextResponse.json({
    level,
    updated: updatedPatterns.map((p) => ({
      pattern: p.pattern,
      weight: p.weight,
      strongCount: p.strongCount,
      weakCount: p.weakCount,
    })),
    adjustments: adjustments.map((a) => ({
      pattern: a.pattern,
      type: a.type,
      reason: a.reason,
      oldWeight: a.oldWeight,
      newWeight: a.newWeight,
    })),
  });
}
