export type PatternRecord = {
  id: string;
  pattern: string;
  weight: number;
  strongCount: number;
  weakCount: number;
};

export type Adjustment = {
  id: string;
  pattern: string;
  type: "違和感" | "曖昧さ" | "分岐";
  reason: string;
  oldWeight: number;
  newWeight: number;
};

export type Level = "強い" | "普通" | "弱い";

const WEIGHT_MIN = 0.1;
const WEIGHT_MAX = 3.0;

const LEVEL_DELTA: Record<Level, number> = {
  "強い": +0.2,
  "普通": +0.05,  // 小さな正の補強。strongCount には加算しない
  "弱い": -0.3,
};

function clamp(v: number) {
  return Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, v));
}

function round1(v: number) {
  return Math.round(v * 10) / 10;
}

/** 3段階レベルによる重み調整 */
export function applyLevelDelta(weight: number, level: Level): number {
  return round1(clamp(weight + LEVEL_DELTA[level]));
}

/** 後方互換: boolean → Level に変換して委譲 */
export function applyRawDelta(weight: number, strong: boolean): number {
  return applyLevelDelta(weight, strong ? "強い" : "弱い");
}

/**
 * 違和感チェック
 * 重みが高いのに実績が悪いパターン → 大幅に下げる
 * 条件: weight >= 2.0 かつ weakRate >= 50% (3件以上のデータ)
 */
export function checkDissonance(p: PatternRecord): Adjustment | null {
  const total = p.strongCount + p.weakCount;
  if (total < 3) return null;
  if (p.weight < 2.0) return null;

  const weakRate = p.weakCount / total;
  if (weakRate < 0.5) return null;

  const newWeight = round1(clamp(p.weight * 0.7));
  return {
    id: p.id,
    pattern: p.pattern,
    type: "違和感",
    reason: `重み${p.weight}だが弱い投稿率${Math.round(weakRate * 100)}%—実態に合わせて引き下げ`,
    oldWeight: p.weight,
    newWeight,
  };
}

/**
 * 曖昧さチェック
 * 強い/弱い両方に均等に現れるパターン → 中立に引き戻す
 * 条件: 4件以上 かつ strongRate が 35%〜65%
 */
export function checkAmbiguity(p: PatternRecord): Adjustment | null {
  const total = p.strongCount + p.weakCount;
  if (total < 4) return null;

  const strongRate = p.strongCount / total;
  if (strongRate < 0.35 || strongRate > 0.65) return null;

  // 1.0（中立）に30%だけ引き寄せる
  const newWeight = round1(clamp(p.weight + (1.0 - p.weight) * 0.3));
  if (Math.abs(newWeight - p.weight) < 0.05) return null;

  return {
    id: p.id,
    pattern: p.pattern,
    type: "曖昧さ",
    reason: `強/弱の比率${Math.round(strongRate * 100)}%/${Math.round((1 - strongRate) * 100)}%—判別力がないため中立へ`,
    oldWeight: p.weight,
    newWeight,
  };
}

/**
 * 分岐チェック
 * 同カテゴリ内で勝者と敗者が分かれている場合 → 敗者を降格
 * 条件: 同じプレフィックス（「:」前）を持つパターン群の中で
 *       best.strongRate >= 65% かつ worst.strongRate <= 35%
 */
export function checkBranching(patterns: PatternRecord[]): Adjustment[] {
  const groups: Record<string, PatternRecord[]> = {};

  for (const p of patterns) {
    // "疑問フック: 〜" → "疑問フック" をキーにグループ化
    const key = p.pattern.split(/[：:]/)[0].trim();
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }

  const adjustments: Adjustment[] = [];

  for (const group of Object.values(groups)) {
    if (group.length < 2) continue;

    const withRate = group.map((p) => {
      const total = p.strongCount + p.weakCount;
      return { ...p, strongRate: total < 2 ? 0.5 : p.strongCount / total, total };
    });

    const sorted = [...withRate].sort((a, b) => b.strongRate - a.strongRate);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    if (best.id === worst.id) continue;
    if (best.strongRate < 0.65 || worst.strongRate > 0.35) continue;
    if (worst.total < 2) continue;

    const newWeight = round1(clamp(worst.weight * 0.5));
    adjustments.push({
      id: worst.id,
      pattern: worst.pattern,
      type: "分岐",
      reason: `同カテゴリの「${best.pattern.split(/[：:]/)[1]?.trim() ?? best.pattern}」が強率${Math.round(best.strongRate * 100)}%—競合パターンを降格`,
      oldWeight: worst.weight,
      newWeight,
    });
  }

  return adjustments;
}

/** 三つのチェックをまとめて実行 */
export function runAllChecks(patterns: PatternRecord[]): Adjustment[] {
  const adjustments: Adjustment[] = [];

  for (const p of patterns) {
    const d = checkDissonance(p);
    if (d) { adjustments.push(d); continue; }

    const a = checkAmbiguity(p);
    if (a) adjustments.push(a);
  }

  adjustments.push(...checkBranching(patterns));
  return adjustments;
}
