import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  // ── アカウント ─────────────────────────────────────────────────
  const accountA = await prisma.account.upsert({
    where: { handle: "horror_test" },
    create: {
      name: "ホラー編集長[TEST]",
      handle: "horror_test",
      bio: "怪談・ホラー系コンテンツ",
      style: "実話風・緊張感を高める・短文で引きつける",
      isActive: true,
    },
    update: { isActive: true },
  });

  await prisma.account.updateMany({
    where: { id: { not: accountA.id } },
    data: { isActive: false },
  });

  const accountB = await prisma.account.upsert({
    where: { handle: "biz_test" },
    create: {
      name: "ビジネス情報[TEST]",
      handle: "biz_test",
      bio: "仕事効率化・マネー情報",
      style: "データ重視・数字で語る・論理的",
      isActive: false,
    },
    update: {},
  });

  // ── ジャンル ───────────────────────────────────────────────────
  const genreHorror = await prisma.genre.upsert({
    where: { name: "horror" },
    create: {
      name: "horror",
      description: "ホラー・怪談コンテンツ",
      rules: JSON.stringify(["恐怖要素を必ず入れる", "実話風に書く", "謎を残す"]),
      examples: JSON.stringify(["「去年の夏、廃病院に行った話。」", "「友人から送られてきた写真に...」"]),
    },
    update: {},
  });

  const genreBiz = await prisma.genre.upsert({
    where: { name: "business" },
    create: {
      name: "business",
      description: "ビジネス・仕事術",
      rules: JSON.stringify(["数字を使う", "即使える情報", "シンプルに"]),
      examples: JSON.stringify(["「残業を週20時間削減した3つの習慣」", "「年収を上げた人がやめたこと5選」"]),
    },
    update: {},
  });

  // ── アカウントAの投稿 (バズ/考察/刺さる) ───────────────────────
  const postBuzz = await prisma.post.create({
    data: {
      accountId: accountA.id,
      genreId:   genreHorror.id,
      content: "【実話】去年の夏、廃病院に肝試しに行った友人が撮影した写真がある。\n\n何も写っていない廊下の奥に、うっすらと女の輪郭が。\n\n「現像したら誰もいないはずの場所に」という言葉で始まった連絡が、今でも忘れられない。",
      imagePrompt: "abandoned hospital corridor, eerie fog, dark silhouette, horror photography, 4K cinematic",
      videoPrompt: "slow creeping pan through abandoned hospital corridor, flickering lights, mysterious shadow at end, 10s horror clip",
      postType: "バズ",
      status: "posted",
      usedPatterns: JSON.stringify(["実話フック: リアル体験を強調", "強調ブラケット: 【〜】で始まる"]),
    },
  });

  const postAnalysis = await prisma.post.create({
    data: {
      accountId: accountA.id,
      genreId:   genreHorror.id,
      content: "「霊感がある」という人に実際に会ったことがある。\n\n彼女が言う「見える」という感覚を聞いていると、あなたも「もしかして自分も...」と思わせられる。\n\n人間の感覚のボーダーラインって、どこにあるんだろう。",
      imagePrompt: "mysterious person with glowing eyes in dark room, paranormal, cinematic, soft light",
      videoPrompt: "close-up of person staring at something off-camera, slow zoom, mysterious atmosphere, 8s clip",
      postType: "考察",
      status: "posted",
      usedPatterns: JSON.stringify(["疑問フック: 「なぜ〜？」で始まる", "改行あり: 読みやすい段落構成"]),
    },
  });

  const postEmotional = await prisma.post.create({
    data: {
      accountId: accountA.id,
      genreId:   genreHorror.id,
      content: "深夜2時に鳴ったインターホン。\n\n誰もいない。\n\nでも、その後から玄関のドアノブが、ゆっくりと回り始めた。",
      imagePrompt: "front door at night, dark hallway, door knob turning, horror, dramatic shadow",
      videoPrompt: "close-up door knob slowly turning in darkness, creaking sound, 6s suspense clip",
      postType: "刺さる",
      status: "draft",
      usedPatterns: JSON.stringify(["改行あり: 読みやすい段落構成", "短文投稿: 80文字以内のコンパクトな投稿"]),
    },
  });

  // ── アカウントBの投稿 ──────────────────────────────────────────
  const postBizA = await prisma.post.create({
    data: {
      accountId: accountB.id,
      genreId:   genreBiz.id,
      content: "残業を月40時間から0にした話。\n\n鍵は「定時退社の宣言」ではなく「タスクの可視化」だった。\n\n3つのステップで、誰でも再現できる。",
      imagePrompt: "clean desk with laptop, organized workspace, productivity, bright natural light",
      videoPrompt: "timelapse of organized work desk, efficiency, morning light, 8s motivational clip",
      postType: "即時価値",
      status: "posted",
      usedPatterns: JSON.stringify(["数字フック: 数字+リスト", "即時価値フック: 即効性を強調"]),
    },
  });

  // ── メトリクス (強い/普通/弱い で投稿を評価) ───────────────────
  // postBuzz → 強い (いいね率4.0%, コメント率0.6%)
  await prisma.postMetric.create({
    data: {
      postId:        postBuzz.id,
      accountId:     accountA.id,
      impressions:   5000,
      likes:         200,
      retweets:      60,
      replies:       30,
      bookmarks:     90,
      engagementRate: 5.32,
    },
  });

  // postAnalysis → 普通 (いいね率1.5%, コメント率0.2%)
  await prisma.postMetric.create({
    data: {
      postId:        postAnalysis.id,
      accountId:     accountA.id,
      impressions:   4000,
      likes:         60,
      retweets:      15,
      replies:       8,
      bookmarks:     20,
      engagementRate: 1.84,
    },
  });

  // postBizA → アカウントBのメトリクス
  await prisma.postMetric.create({
    data: {
      postId:        postBizA.id,
      accountId:     accountB.id,
      impressions:   8000,
      likes:         320,
      retweets:      100,
      replies:       45,
      bookmarks:     150,
      engagementRate: 6.25,
    },
  });

  // ── アカウントA の学習パターン ─────────────────────────────────
  const patterns = [
    {
      label: "実話フック: リアル体験を強調",
      weight: 2.4, strongCount: 8, weakCount: 2,
      trend: "rising",  lifeScore: 1.3,
    },
    {
      label: "強調ブラケット: 【〜】で始まる",
      weight: 1.8, strongCount: 5, weakCount: 3,
      trend: "stable",  lifeScore: 1.0,
    },
    {
      label: "疑問フック: 「なぜ〜？」で始まる",
      weight: 1.2, strongCount: 3, weakCount: 4,
      trend: "declining", lifeScore: 0.7,
    },
    {
      label: "改行あり: 読みやすい段落構成",
      weight: 1.6, strongCount: 6, weakCount: 2,
      trend: "stable",  lifeScore: 1.1,
    },
    {
      label: "短文投稿: 80文字以内のコンパクトな投稿",
      weight: 0.8, strongCount: 1, weakCount: 5,
      trend: "declining", lifeScore: 0.5,
    },
  ];

  for (const p of patterns) {
    const id = `${accountA.id}_${p.label}`.slice(0, 25);
    await prisma.learningPattern.upsert({
      where:  { id },
      create: { id, accountId: accountA.id, pattern: p.label, weight: p.weight, source: "feedback", strongCount: p.strongCount, weakCount: p.weakCount, trend: p.trend, lifeScore: p.lifeScore },
      update: { weight: p.weight, strongCount: p.strongCount, weakCount: p.weakCount, trend: p.trend, lifeScore: p.lifeScore },
    });
  }

  // アカウントB 専用パターン（Aとは独立）
  const idB = `${accountB.id}_数字フック`.slice(0, 25);
  await prisma.learningPattern.upsert({
    where:  { id: idB },
    create: { id: idB, accountId: accountB.id, pattern: "数字フック: 数字+リスト", weight: 2.1, source: "feedback", strongCount: 6, weakCount: 1, trend: "rising", lifeScore: 1.4 },
    update: { weight: 2.1, strongCount: 6, weakCount: 1, trend: "rising", lifeScore: 1.4 },
  });

  // ── バズ投稿 ────────────────────────────────────────────────────
  await prisma.buzzPost.create({
    data: {
      accountId: accountA.id,
      content:   "なぜか深夜に目が覚めたとき、布団を顔まで引き上げる人の割合は8割を超えるらしい。本能的に何かから身を守ろうとしているのかもしれない。あなたはどう？",
      likes:      12000,
      retweets:   3500,
      replies:    890,
      analysis:   "疑問フックとデータ提示の組み合わせで高コメント誘発。末尾の問いかけが会話を生んでいる。",
      patterns:   JSON.stringify(["疑問フック", "データ・統計"]),
      tags:       JSON.stringify(["#ホラー", "#心理"]),
      source:     "manual",
    },
  });

  return NextResponse.json({
    ok: true,
    summary: {
      accountA: { id: accountA.id, name: accountA.name },
      accountB: { id: accountB.id, name: accountB.name },
      posts:    { a: 3, b: 1 },
      metrics:  3,
      patterns: { a: patterns.length, b: 1 },
      buzzPosts: 1,
    },
  });
}
