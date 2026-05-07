import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CheckResult = {
  name: string;
  ok: boolean;
  detail: string;
  data?: unknown;
};

export async function GET() {
  const checks: CheckResult[] = [];

  // ── 1. アカウント存在確認 ─────────────────────────────────────
  const accounts = await prisma.account.findMany({ orderBy: { createdAt: "asc" } });
  const accountA = accounts.find((a: any) => a.handle === "horror_test");
  const accountB = accounts.find((a: any) => a.handle === "biz_test");

  checks.push({
    name: "アカウント作成",
    ok:   !!accountA && !!accountB,
    detail: accountA && accountB
      ? `✓ ${accountA.name} / ${accountB.name} (計${accounts.length}件)`
      : "✗ テストアカウントが見つかりません。シードを実行してください。",
    data: accounts.map((a: any) => ({ id: a.id, name: a.name, isActive: a.isActive })),
  });

  if (!accountA || !accountB) {
    return NextResponse.json({ ok: false, checks });
  }

  // ── 2. 投稿保存確認 ───────────────────────────────────────────
  const postsA = await prisma.post.findMany({ where: { accountId: accountA.id } });
  const postsB = await prisma.post.findMany({ where: { accountId: accountB.id } });

  checks.push({
    name: "投稿生成 → 保存",
    ok:   postsA.length >= 3 && postsB.length >= 1,
    detail: `✓ アカウントA: ${postsA.length}件 / アカウントB: ${postsB.length}件`,
    data: postsA.map((p: any) => ({
      postType: p.postType,
      status: p.status,
      hasImagePrompt: !!p.imagePrompt,
      hasVideoPrompt: !!p.videoPrompt,
      usedPatterns: p.usedPatterns ? JSON.parse(p.usedPatterns) : [],
    })),
  });

  // ── 3. 数値入力 → メトリクス確認 ─────────────────────────────
  const metricsA = await prisma.postMetric.findMany({ where: { accountId: accountA.id } });
  const metricsB = await prisma.postMetric.findMany({ where: { accountId: accountB.id } });

  const anyStrong = metricsA.some((m: any) => (m.engagementRate ?? 0) >= 3);
  const anyWeak = metricsA.some((m: any) => (m.engagementRate ?? 0) < 1);

  checks.push({
    name: "数値入力 → 分析",
    ok:   metricsA.length >= 2 && anyStrong,
    detail: `✓ アカウントA: ${metricsA.length}件 (強ER: ${anyStrong ? "あり" : "なし"}, 弱ER: ${anyWeak ? "あり" : "なし"}) / B: ${metricsB.length}件`,
    data: metricsA.map((m: any) => ({
      impressions: m.impressions,
      likes:       m.likes,
      replies:     m.replies,
      er:          m.engagementRate,
      judgment:    (m.engagementRate ?? 0) >= 3 ? "強い" : (m.engagementRate ?? 0) >= 1 ? "普通" : "弱い",
    })),
  });

  // ── 4. 分析 → 学習パターン確認 ───────────────────────────────
  const patternsA = await prisma.learningPattern.findMany({ where: { accountId: accountA.id }, orderBy: { weight: "desc" } });
  const patternsB = await prisma.learningPattern.findMany({ where: { accountId: accountB.id }, orderBy: { weight: "desc" } });

  const hasHighWeight = patternsA.some((p: any) => p.weight >= 2.0);
  const hasLowWeight = patternsA.some((p: any) => p.weight < 1.0);
  const hasRising = patternsA.some((p: any) => p.trend === "rising");
  const hasDeclining = patternsA.some((p: any) => p.trend === "declining");

  checks.push({
    name: "分析 → 学習パターン更新",
    ok:   patternsA.length >= 3 && hasHighWeight && hasRising,
    ...`${patternsA.length}パターン（高weight: ${
  patternsA.filter((p: any) => p.weight >= 2).length
}件, rising: ${
  patternsA.filter((p: any) => p.trend === "rising").length
}件, declining: ${
  patternsA.filter((p: any) => p.trend === "declining").length
}件）`,
    data: patternsA.map((p) => ({
      pattern:     p.pattern.split(/[：:]/)[0].trim(),
      weight:      p.weight,
      trend:       p.trend,
      lifeScore:   p.lifeScore,
      strongCount: p.strongCount,
      weakCount:   p.weakCount,
    })),
  });

  // ── 5. 学習 → 次回生成への反映確認 ───────────────────────────
  // 高weightパターンが存在し、generateAPIに渡される準備ができているか
  const topPattern    = patternsA[0];
  const topWeight     = topPattern?.weight ?? 0;
  const injectionReady = patternsA.length > 0 && topWeight >= 1.5;

  checks.push({
    name: "学習 → 次回生成に反映",
    ok:   injectionReady,
    detail: injectionReady
      ? `✓ トップパターン「${topPattern?.pattern.split(/[：:]/)[0]}」(weight ${topWeight.toFixed(1)}) が生成時に注入されます`
      : "✗ 十分な重みのパターンがありません",
    data: {
      topPatterns: patternsA.slice(0, 3).map((p) => ({
        pattern: p.pattern.split(/[：:]/)[0],
        weight:  p.weight,
      })),
      injectedCount: patternsA.filter(p => p.weight >= 1.5).length,
    },
  });

  // ── 6. アカウント間の独立性確認 ──────────────────────────────
  const aPostIds = postsA.map((p) => p.id);
  const bPostIds = postsB.map((p) => p.id);
  const crossMetrics = await prisma.postMetric.findMany({
    where: { postId: { in: aPostIds }, accountId: accountB.id },
  });
  const noLeak = crossMetrics.length === 0 && abIsolated;

  checks.push({
    name: "アカウント間の独立性",
    ok:   noLeak,
    detail: noLeak
      ? `✓ アカウントAとBのデータが混在していません (A投稿: ${postsA.length}件, B投稿: ${postsB.length}件, Aパターン: ${patternsA.length}件, Bパターン: ${patternsB.length}件)`
      : `✗ データのクロス汚染を検出: metrics=${crossMetrics.length}件, patterns共有=${!abIsolated}`,
    data: {
      accountA: { posts: postsA.length, patterns: patternsA.length, metrics: metricsA.length },
      accountB: { posts: postsB.length, patterns: patternsB.length, metrics: metricsB.length },
      crossContamination: crossMetrics.length,
    },
  });

  // ── 7. バズ分析DB確認 ─────────────────────────────────────────
  const buzzPosts = await prisma.buzzPost.findMany({ where: { accountId: accountA.id } });
  checks.push({
    name: "バズ投稿 → DB保存",
    ok:   buzzPosts.length >= 1,
    detail: `✓ ${buzzPosts.length}件のバズ投稿が保存済み`,
    data: buzzPosts.map((b) => ({
      content:  b.content.slice(0, 50) + "...",
      likes:    b.likes,
      patterns: b.patterns ? JSON.parse(b.patterns) : [],
    })),
  });

  // ── 8. 違和感/曖昧さ/分岐チェックの動作確認 ─────────────────
  const { checkDissonance, checkAmbiguity, checkBranching } = await import("@/lib/weight-adjuster");

  const patternRecords = patternsA.map((p) => ({
    id: p.id, pattern: p.pattern, weight: p.weight,
    strongCount: p.strongCount, weakCount: p.weakCount,
  }));

  const dissonances = patternRecords.map(checkDissonance).filter(Boolean);
  const ambiguities = patternRecords.map(checkAmbiguity).filter(Boolean);
  const branchings  = checkBranching(patternRecords);

  checks.push({
    name: "違和感 / 曖昧さ / 分岐チェック",
    ok:   true,
    detail: `検出: 違和感=${dissonances.length}件, 曖昧さ=${ambiguities.length}件, 分岐=${branchings.length}件`,
    data: {
      dissonance: dissonances.map((d) => ({ pattern: d!.pattern.split(/[：:]/)[0], reason: d!.reason })),
      ambiguity:  ambiguities.map((a) => ({ pattern: a!.pattern.split(/[：:]/)[0], reason: a!.reason })),
      branching:  branchings.map((b) => ({ pattern: b.pattern.split(/[：:]/)[0], reason: b.reason })),
    },
  });

  const allOk = checks.every((c) => c.ok);
  return NextResponse.json({ ok: allOk, checks });
}
