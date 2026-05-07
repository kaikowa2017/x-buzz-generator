import { readFileSync } from "fs";
import { join } from "path";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type RiskLevel = "safe" | "caution" | "blocked";

export interface XRule {
  id:          string;
  name:        string;
  level:       "blocked" | "caution";
  scope:       "text" | "image_video" | "all";
  description: string;
  patterns:    string[];
  note?:       string;
}

export interface RulesConfig {
  version:            string;
  updatedAt:          string;
  pasteUpdatedAt?:    string;   // 手動貼り付けで更新した日時
  rawTextSummary?:    string;   // 貼り付けテキストの冒頭400文字
  detectedCategories?: string[]; // 貼り付けテキストで検出されたカテゴリID
  source:             string;
  note?:              string;
  rules:              XRule[];
}

export interface Violation {
  ruleId:   string;
  ruleName: string;
  level:    "blocked" | "caution";
  detail:   string;
  scope:    string;
}

export interface GuardResult {
  riskLevel:  RiskLevel;
  violations: Violation[];
}

/* ------------------------------------------------------------------ */
/* ルール読み込み（動的: サーバーサイドのみ）                           */
/* ------------------------------------------------------------------ */

let _cached: RulesConfig | null = null;

export function loadRules(): RulesConfig {
  if (_cached) return _cached;
  const path = join(process.cwd(), "rules", "x-rules.json");
  const raw  = readFileSync(path, "utf-8");
  _cached    = JSON.parse(raw) as RulesConfig;
  return _cached;
}

/** 開発時にキャッシュをフラッシュ */
export function clearRulesCache(): void { _cached = null; }

/* ------------------------------------------------------------------ */
/* 高速 regex チェック                                                  */
/* ------------------------------------------------------------------ */

function matchScope(rule: XRule, scope: "text" | "image_video"): boolean {
  return rule.scope === "all" || rule.scope === scope;
}

function checkPatterns(rule: XRule, text: string): boolean {
  return rule.patterns.some((pattern) => {
    try {
      return new RegExp(pattern, "i").test(text);
    } catch {
      return false; // 不正なパターンは無視
    }
  });
}

function getMatchedPattern(rule: XRule, text: string): string {
  for (const pattern of rule.patterns) {
    try {
      const m = text.match(new RegExp(pattern, "i"));
      if (m) return m[0].slice(0, 20); // 最大20文字
    } catch {}
  }
  return "(パターンマッチ)";
}

/**
 * 高速同期チェック（サーバーサイド）
 * @param text    投稿本文
 * @param imagePrompt 画像プロンプト（任意）
 * @param videoPrompt 動画プロンプト（任意）
 */
export function fastCheck(
  text:          string,
  imagePrompt?:  string,
  videoPrompt?:  string
): GuardResult {
  const config = loadRules();
  const violations: Violation[] = [];

  for (const rule of config.rules) {
    // テキストスコープのチェック
    if (matchScope(rule, "text") && checkPatterns(rule, text)) {
      violations.push({
        ruleId:   rule.id,
        ruleName: rule.name,
        level:    rule.level,
        detail:   `「${getMatchedPattern(rule, text)}」が検出されました。${rule.description}`,
        scope:    "text",
      });
    }

    // 画像/動画プロンプトのスコープのチェック
    if (matchScope(rule, "image_video")) {
      const combined = [imagePrompt ?? "", videoPrompt ?? ""].join(" ");
      if (combined.trim() && checkPatterns(rule, combined)) {
        violations.push({
          ruleId:   rule.id,
          ruleName: rule.name,
          level:    rule.level,
          detail:   `プロンプト内に「${getMatchedPattern(rule, combined)}」が検出されました。${rule.description}`,
          scope:    "image_video",
        });
      }
    }
  }

  // 重複排除（同一 ruleId は 1 件に集約）
  const unique = violations.filter((v, i, a) => a.findIndex((x) => x.ruleId === v.ruleId) === i);

  let riskLevel: RiskLevel = "safe";
  if (unique.some((v) => v.level === "blocked")) riskLevel = "blocked";
  else if (unique.some((v) => v.level === "caution")) riskLevel = "caution";

  return { riskLevel, violations: unique };
}

/* ------------------------------------------------------------------ */
/* ルール一覧（設定ページ表示用）                                       */
/* ------------------------------------------------------------------ */

export function getRulesSummary() {
  const config = loadRules();
  return {
    version:   config.version,
    updatedAt: config.updatedAt,
    total:     config.rules.length,
    blocked:   config.rules.filter((r) => r.level === "blocked").length,
    caution:   config.rules.filter((r) => r.level === "caution").length,
    rules:     config.rules.map((r) => ({
      id:          r.id,
      name:        r.name,
      level:       r.level,
      description: r.description,
    })),
  };
}
