import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type QualityLevel = "blocked" | "warning" | "info";
export type QualityRisk  = "safe" | "caution" | "blocked";

export type QualityIssue = {
  checkId:  string;
  name:     string;
  level:    QualityLevel;
  detail:   string;
  hint?:    string;   // 改善ヒント
};

export type QualityResult = {
  overallRisk:        QualityRisk;
  issues:             QualityIssue[];
  postTypeSuggestion: string | null;  // 投稿タイプ推奨
  structureInsight:   string | null;  // 伸びた型 / 弱い型
};

/* ------------------------------------------------------------------ */
/* 1. 誤情報・断定表現チェック                                          */
/* ------------------------------------------------------------------ */

const MISINFORMATION_PATTERNS = [
  // 根拠なし断定
  { re: /(?:絶対に|必ず|100%|確実に)(?:稼げる|痩せる|治る|成功する|上がる|下がる)/, msg: "根拠のない断定表現" },
  { re: /科学的に証明された/, msg: "「科学的に証明された」は要出典" },
  { re: /専門家(?:が|によると).{0,5}(?:おすすめ|推薦|認めた)/, msg: "専門家引用は出典が必要" },
  { re: /(?:研究|調査)で(?:判明|証明|確認)/, msg: "研究引用は出典が必要" },
];

export function checkMisinformation(text: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  for (const { re, msg } of MISINFORMATION_PATTERNS) {
    if (re.test(text)) {
      issues.push({
        checkId: "misinformation",
        name:    "誤情報/断定表現",
        level:   "warning",
        detail:  msg,
        hint:    "「〜かもしれない」「〜という見方もある」など、断定を和らげる表現を使ってください",
      });
    }
  }
  return issues;
}

/* ------------------------------------------------------------------ */
/* 2. 過度な煽りチェック                                                */
/* ------------------------------------------------------------------ */

const PROVOCATION_PATTERNS = [
  { re: /(?:バカ|アホ|馬鹿|無能|クズ|ゴミ|最低)(?:な|の|だ).{0,10}(?:人|奴|やつ|連中|者)/, msg: "特定集団への侮辱的表現" },
  { re: /これ(?:を|が)わからない(?:人|奴)は/, msg: "知能を否定する煽り" },
  { re: /(?:信じている|信じてる)人は(?:バカ|アホ|哀れ|終わり|ヤバい)/, msg: "他者の信念への過激な否定" },
  { re: /(?:炎上|バズり)(?:を|確定|狙い)/, msg: "炎上を意図する表現" },
  { re: /(?:反論|文句)あるなら(?:来い|言え|かかってこい)/, msg: "攻撃的な挑発" },
];

export function checkOverProvocation(text: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  for (const { re, msg } of PROVOCATION_PATTERNS) {
    if (re.test(text)) {
      issues.push({
        checkId: "provocation",
        name:    "過度な煽り",
        level:   "warning",
        detail:  msg,
        hint:    "批判するなら「〜の部分は改善できる」など建設的な視点を加えてください",
      });
    }
  }
  return issues;
}

/* ------------------------------------------------------------------ */
/* 3. アカウント別NGワードチェック                                      */
/* ------------------------------------------------------------------ */

export async function checkNGWords(text: string, accountId: string): Promise<QualityIssue[]> {
  const ngWords = await prisma.accountNGWord.findMany({ where: { accountId } });
  const found   = ngWords.filter((w) => text.includes(w.word));
  if (!found.length) return [];
  return [{
    checkId: "ng_words",
    name:    "NGワード検出",
    level:   "blocked",
    detail:  `アカウント設定のNGワードが含まれています: 「${found.map((w) => w.word).join("」「")}」`,
    hint:    "アカウント設定でNGワードを管理できます",
  }];
}

/* ------------------------------------------------------------------ */
/* 4. 類似投稿チェック（Jaccard類似度）                                 */
/* ------------------------------------------------------------------ */

function tokenize(text: string): Set<string> {
  return new Set(text.replace(/[^\w぀-鿿]/g, " ").split(/\s+/).filter((t) => t.length >= 2));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union        = new Set([...a, ...b]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export async function checkSimilarPosts(text: string, accountId: string): Promise<QualityIssue[]> {
  const recentPosts = await prisma.post.findMany({
    where:   { accountId },
    orderBy: { createdAt: "desc" },
    take:    20,
    select:  { content: true, createdAt: true },
  });

  const newTokens = tokenize(text);
  for (const post of recentPosts) {
    const sim = jaccardSimilarity(newTokens, tokenize(post.content));
    if (sim >= 0.55) {
      const days = Math.floor((Date.now() - new Date(post.createdAt).getTime()) / 86400000);
      return [{
        checkId: "similarity",
        name:    "類似投稿の重複",
        level:   "warning",
        detail:  `${days}日前の投稿と類似度 ${(sim * 100).toFixed(0)}% です（閾値: 55%）`,
        hint:    "フックの言葉や構成を変えてバリエーションをつけましょう",
      }];
    }
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* 5. ブランド一貫性チェック                                            */
/* ------------------------------------------------------------------ */

export async function checkBrandConsistency(text: string, accountId: string): Promise<QualityIssue[]> {
  const account = await prisma.account.findUnique({ where: { id: accountId }, select: { style: true, name: true } });
  if (!account?.style) return [];

  const styleKeywords = account.style
    .split(/[、。,.\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);

  if (!styleKeywords.length) return [];

  // スタイルキーワードと投稿の語調の乖離を簡易チェック
  const formalMarkers   = ["です", "ます", "でございます", "〜ております"];
  const informalMarkers = ["だよ", "だね", "じゃん", "っしょ", "っていう"];

  const styleFormal   = formalMarkers.some((m) => account.style!.includes(m));
  const textInformal  = informalMarkers.some((m) => text.includes(m));
  const styleInformal = informalMarkers.some((m) => account.style!.includes(m));
  const textFormal    = formalMarkers.some((m) => text.includes(m));

  if ((styleFormal && textInformal) || (styleInformal && textFormal)) {
    return [{
      checkId: "brand_consistency",
      name:    "ブランド一貫性",
      level:   "info",
      detail:  `アカウント「${account.name}」の設定スタイルと語調が異なる可能性があります`,
      hint:    `スタイル設定: ${account.style.slice(0, 60)}...`,
    }];
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* 6. 飽きられた型の検知                                                */
/* ------------------------------------------------------------------ */

import { HOOK_PATTERNS } from "@/lib/learner";

export async function checkOverusedPattern(text: string, accountId: string): Promise<QualityIssue[]> {
  const recentPosts = await prisma.post.findMany({
    where:   { accountId },
    orderBy: { createdAt: "desc" },
    take:    20,
    select:  { content: true, usedPatterns: true },
  });

  if (recentPosts.length < 5) return [];

  // 各パターンの出現頻度をカウント
  const patternCount: Record<string, number> = {};
  for (const post of recentPosts) {
    for (const { re, label } of HOOK_PATTERNS) {
      if (re.test(post.content)) {
        patternCount[label] = (patternCount[label] ?? 0) + 1;
      }
    }
  }

  // 現在の投稿にマッチするパターンで頻度が高いものを検出
  const issues: QualityIssue[] = [];
  for (const { re, label } of HOOK_PATTERNS) {
    if (re.test(text) && (patternCount[label] ?? 0) >= 5) {
      issues.push({
        checkId: "overused_pattern",
        name:    "飽きられた型の検知",
        level:   "info",
        detail:  `「${label.split(/[：:]/)[0]}」パターンを直近20投稿中 ${patternCount[label]} 回使用しています`,
        hint:    "別のフックパターン（違和感検知・共感・数字リストなど）を試してみましょう",
      });
      break; // 最初の1件だけ報告
    }
  }
  return issues;
}

/* ------------------------------------------------------------------ */
/* 7. 投稿タイプ比率チェック                                            */
/* ------------------------------------------------------------------ */

export async function checkPostTypeRatio(
  currentPostType: string | null,
  accountId: string
): Promise<{ suggestion: string | null }> {
  const recentPosts = await prisma.post.findMany({
    where:   { accountId, postType: { not: null } },
    orderBy: { createdAt: "desc" },
    take:    15,
    select:  { postType: true },
  });

  if (recentPosts.length < 5) return { suggestion: null };

  const counts: Record<string, number> = { バズ: 0, 考察: 0, 刺さる: 0 };
  for (const post of recentPosts) {
    const t = post.postType ?? "不明";
    counts[t] = (counts[t] ?? 0) + 1;
  }

  const total = recentPosts.length;
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  if (dominant && dominant[1] / total >= 0.70) {
    const alternatives = Object.entries(counts)
      .filter(([type]) => type !== dominant[0])
      .sort((a, b) => a[1] - b[1])
      .map(([type]) => type);

    const suggest = alternatives[0];
    if (suggest && currentPostType === dominant[0]) {
      return {
        suggestion: `直近の投稿が「${dominant[0]}」に偏っています（${dominant[1]}/${total}件）。「${suggest}」タイプを試すと新しい読者層にリーチできます`,
      };
    }
  }

  return { suggestion: null };
}

/* ------------------------------------------------------------------ */
/* 8. 構造学習インサイト（伸びた型 / 弱い型）                           */
/* ------------------------------------------------------------------ */

export async function getStructureInsight(accountId: string): Promise<string | null> {
  const patterns = await prisma.learningPattern.findMany({
    where:   { accountId },
    orderBy: { weight: "desc" },
    take:    5,
  });

  if (!patterns.length) return null;

  const top    = patterns.filter((p) => p.weight >= 2.0);
  const rising = patterns.filter((p) => p.trend === "rising");
  const weak   = patterns.filter((p) => p.trend === "declining");

  const parts: string[] = [];
  if (rising.length)  parts.push(`上昇中: ${rising[0].pattern.split(/[：:]/)[0]}`);
  if (top.length)     parts.push(`高重み: ${top[0].pattern.split(/[：:]/)[0]}`);
  if (weak.length)    parts.push(`低下中: ${weak[0].pattern.split(/[：:]/)[0]}`);

  return parts.length ? parts.join(" / ") : null;
}

/* ------------------------------------------------------------------ */
/* 9. 画像/動画プロンプト品質チェック                                   */
/* ------------------------------------------------------------------ */

export function checkImagePromptQuality(imagePrompt: string, videoPrompt: string): QualityIssue[] {
  const issues: QualityIssue[] = [];

  if (imagePrompt) {
    if (imagePrompt.length < 15) {
      issues.push({
        checkId: "image_quality",
        name:    "画像プロンプト品質",
        level:   "info",
        detail:  "画像プロンプトが短すぎます（15文字未満）",
        hint:    "スタイル・ムード・品質タグ（4K, cinematic等）を追加しましょう",
      });
    }
    if (!/(?:realistic|cinematic|photorealistic|detailed|quality|style|4k|8k|hd)/i.test(imagePrompt)) {
      issues.push({
        checkId: "image_quality_tags",
        name:    "画像品質タグ",
        level:   "info",
        detail:  "品質指定タグ（4K, cinematic, photorealistic等）が見当たりません",
        hint:    "品質タグを追加すると生成品質が上がります",
      });
    }
  }

  if (videoPrompt && videoPrompt.length < 15) {
    issues.push({
      checkId: "video_quality",
      name:    "動画プロンプト品質",
      level:   "info",
      detail:  "動画プロンプトが短すぎます",
      hint:    "カメラワーク・秒数・ムードを追加しましょう",
    });
  }

  return issues;
}

/* ------------------------------------------------------------------ */
/* 統合チェック関数                                                     */
/* ------------------------------------------------------------------ */

export async function runQualityChecks(opts: {
  content:       string;
  imagePrompt?:  string;
  videoPrompt?:  string;
  accountId?:    string;
  postType?:     string | null;
}): Promise<QualityResult> {
  const { content, imagePrompt = "", videoPrompt = "", accountId, postType } = opts;

  // 同期チェック（常に実行）
  const syncIssues: QualityIssue[] = [
    ...checkMisinformation(content),
    ...checkOverProvocation(content),
    ...checkImagePromptQuality(imagePrompt, videoPrompt),
  ];

  // 非同期チェック（accountIdがある場合）
  let asyncIssues: QualityIssue[] = [];
  let suggestion: string | null   = null;
  let structureInsight: string | null = null;

  if (accountId) {
    const [ngIssues, simIssues, brandIssues, overusedIssues, postTypeResult, insight] = await Promise.all([
      checkNGWords(content, accountId),
      checkSimilarPosts(content, accountId),
      checkBrandConsistency(content, accountId),
      checkOverusedPattern(content, accountId),
      checkPostTypeRatio(postType ?? null, accountId),
      getStructureInsight(accountId),
    ]);

    asyncIssues      = [...ngIssues, ...simIssues, ...brandIssues, ...overusedIssues];
    suggestion       = postTypeResult.suggestion;
    structureInsight = insight;
  }

  const allIssues = [...syncIssues, ...asyncIssues];

  let overallRisk: QualityRisk = "safe";
  if (allIssues.some((i) => i.level === "blocked"))      overallRisk = "blocked";
  else if (allIssues.some((i) => i.level === "warning")) overallRisk = "caution";

  return { overallRisk, issues: allIssues, postTypeSuggestion: suggestion, structureInsight };
}
