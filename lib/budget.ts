import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/* コスト定数                                                           */
/* ------------------------------------------------------------------ */

// Claude Sonnet 4.6 の料金（USD per 1M tokens）
const INPUT_PER_M  = 3.00;
const OUTPUT_PER_M = 15.00;
const USD_TO_JPY   = 150;  // 1 USD = 150 JPY（概算）

/* ------------------------------------------------------------------ */
/* 日付ユーティリティ                                                   */
/* ------------------------------------------------------------------ */

function getToday(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/* ------------------------------------------------------------------ */
/* DB キー定数                                                          */
/* ------------------------------------------------------------------ */

const KEY_BUDGET    = "daily_budget_jpy";
const KEY_USAGE_USD = "today_usage_usd";
const KEY_LAST_DATE = "last_reset_date";

/* ------------------------------------------------------------------ */
/* 日付変化時リセット                                                   */
/* ------------------------------------------------------------------ */

export async function resetIfNewDay(): Promise<void> {
  const today      = getToday();
  const lastRecord = await prisma.appConfig.findUnique({ where: { key: KEY_LAST_DATE } });

  if (lastRecord?.value === today) return; // 同日 → リセット不要

  await prisma.$transaction([
    prisma.appConfig.upsert({
      where:  { key: KEY_USAGE_USD },
      create: { key: KEY_USAGE_USD, value: "0" },
      update: { value: "0" },
    }),
    prisma.appConfig.upsert({
      where:  { key: KEY_LAST_DATE },
      create: { key: KEY_LAST_DATE, value: today },
      update: { value: today },
    }),
  ]);
}

/* ------------------------------------------------------------------ */
/* 予算値の取得（DB → env → 0=無制限）                                 */
/* ------------------------------------------------------------------ */

async function getDailyBudgetJpy(): Promise<number> {
  const config = await prisma.appConfig.findUnique({ where: { key: KEY_BUDGET } });
  if (config?.value) return Number(config.value);
  return Number(process.env.DAILY_BUDGET_JPY ?? "0");
}

async function getTodayUsageUsd(): Promise<number> {
  const config = await prisma.appConfig.findUnique({ where: { key: KEY_USAGE_USD } });
  return Number(config?.value ?? "0");
}

/* ------------------------------------------------------------------ */
/* 予算チェック（API呼び出し前）                                        */
/* ------------------------------------------------------------------ */

export type BudgetCheckResult =
  | { ok: true }
  | { ok: false; message: string };

export async function checkBudget(): Promise<BudgetCheckResult> {
  await resetIfNewDay();

  const budget = await getDailyBudgetJpy();
  if (budget === 0) return { ok: true }; // 無制限

  const usageUsd = await getTodayUsageUsd();
  const usageJpy = Math.ceil(usageUsd * USD_TO_JPY);

  if (usageJpy >= budget) {
    return {
      ok: false,
      message: `今日のAPI利用上限（${budget}円）に達しました。明日になると自動でリセットされます。`,
    };
  }

  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* 使用量の加算（API呼び出し後）                                        */
/* ------------------------------------------------------------------ */

export function calcCostUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * INPUT_PER_M +
         (outputTokens / 1_000_000) * OUTPUT_PER_M;
}

export async function addUsage(inputTokens: number, outputTokens: number): Promise<number> {
  const costUsd    = calcCostUsd(inputTokens, outputTokens);
  const currentUsd = await getTodayUsageUsd();
  const newUsd     = currentUsd + costUsd;

  await prisma.appConfig.upsert({
    where:  { key: KEY_USAGE_USD },
    create: { key: KEY_USAGE_USD, value: String(newUsd) },
    update: { value: String(newUsd) },
  });

  return costUsd;
}

/* ------------------------------------------------------------------ */
/* ステータス取得（設定ページ表示用）                                   */
/* ------------------------------------------------------------------ */

export type BudgetStatus = {
  budgetJpy:   number;         // 0 = 無制限
  usageJpy:    number;
  usageUsd:    number;
  remainingJpy: number | null; // null = 無制限
  percentage:  number | null;  // 0-100, null = 無制限
  isUnlimited: boolean;
  isOverBudget: boolean;
  today:       string;
};

export async function getBudgetStatus(): Promise<BudgetStatus> {
  await resetIfNewDay();

  const [budgetJpy, usageUsd] = await Promise.all([
    getDailyBudgetJpy(),
    getTodayUsageUsd(),
  ]);

  const usageJpy = Math.ceil(usageUsd * USD_TO_JPY);

  return {
    budgetJpy,
    usageJpy,
    usageUsd,
    remainingJpy:  budgetJpy > 0 ? Math.max(0, budgetJpy - usageJpy) : null,
    percentage:    budgetJpy > 0 ? Math.min(100, Math.round((usageJpy / budgetJpy) * 100)) : null,
    isUnlimited:   budgetJpy === 0,
    isOverBudget:  budgetJpy > 0 && usageJpy >= budgetJpy,
    today:         getToday(),
  };
}

/* ------------------------------------------------------------------ */
/* 予算設定                                                             */
/* ------------------------------------------------------------------ */

export async function setDailyBudget(yen: number): Promise<void> {
  await prisma.appConfig.upsert({
    where:  { key: KEY_BUDGET },
    create: { key: KEY_BUDGET, value: String(yen) },
    update: { value: String(yen) },
  });
}

export async function resetTodayUsage(): Promise<void> {
  await prisma.$transaction([
    prisma.appConfig.upsert({
      where:  { key: KEY_USAGE_USD },
      create: { key: KEY_USAGE_USD, value: "0" },
      update: { value: "0" },
    }),
    prisma.appConfig.upsert({
      where:  { key: KEY_LAST_DATE },
      create: { key: KEY_LAST_DATE, value: getToday() },
      update: { value: getToday() },
    }),
  ]);
}
