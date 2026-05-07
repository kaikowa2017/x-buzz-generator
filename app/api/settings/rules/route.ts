import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { clearRulesCache, type RulesConfig, type XRule } from "@/lib/xRulesGuard";

const RULES_PATH = join(process.cwd(), "rules", "x-rules.json");

/* ------------------------------------------------------------------ */
/* カテゴリ → キーワードマッピング                                      */
/* ------------------------------------------------------------------ */

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  violence_direct:          ["暴力", "脅迫", "危害", "傷つける", "殺", "暴行"],
  hate_speech:              ["ヘイト", "差別", "偏見", "侮辱", "嫌悪", "排除"],
  harassment:               ["ハラスメント", "嫌がらせ", "誹謗", "中傷", "付きまとい"],
  personal_info:            ["個人情報", "プライバシー", "住所", "電話番号", "特定"],
  adult_content:            ["成人向け", "性的", "18歳未満", "ポルノ", "わいせつ"],
  self_harm:                ["自傷", "自殺", "自死", "命を絶つ"],
  scam_fraud:               ["詐欺", "誤情報", "虚偽", "フィッシング", "なりすまし詐欺"],
  election_manipulation:    ["選挙", "投票操作", "選挙妨害", "選挙違反"],
  spam_excessive_cta:       ["スパム", "大量送信", "迷惑行為", "過剰な宣伝"],
  impersonation:            ["なりすまし", "偽装", "偽アカウント", "虚偽の身元"],
  illegal_goods:            ["違法", "規制薬物", "武器", "爆発物", "密売"],
  ai_image_misrepresentation:["AI生成", "合成画像", "フェイク", "ディープフェイク"],
};

/* ------------------------------------------------------------------ */
/* 禁止用語の簡易抽出                                                   */
/* ------------------------------------------------------------------ */

const EXTRACT_PHRASES: { pattern: RegExp; ruleId: string }[] = [
  // 「〜は禁止」「〜してはいけない」パターンから用語を拾う
  { pattern: /「([^」]{2,15})」(?:は禁止|はNG|はいけない|しないでください)/g,     ruleId: "" },
  { pattern: /禁止(?:コンテンツ|行為|表現)[：:]\s*([^\n。]{2,30})/g, ruleId: "" },
  { pattern: /次の(?:コンテンツ|投稿|行為)は禁止[：:\s]*([^\n]{2,40})/g, ruleId: "" },
];

function extractProhibitedTerms(text: string): { term: string; ruleId: string }[] {
  const terms: { term: string; ruleId: string }[] = [];

  for (const { pattern } of EXTRACT_PHRASES) {
    let m: RegExpExecArray | null;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((m = re.exec(text)) !== null) {
      const raw = m[1] ?? "";
      const term = raw.trim().slice(0, 20);
      if (term.length >= 2) {
        // どのカテゴリに属するか推定
        const ruleId = guessCategory(term) ?? "violence_direct";
        terms.push({ term, ruleId });
      }
    }
  }
  return terms;
}

function guessCategory(term: string): string | null {
  for (const [id, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => term.includes(kw))) return id;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* テキスト解析のメイン                                                 */
/* ------------------------------------------------------------------ */

function analyzeRulesText(text: string): {
  detectedCategories: string[];
  rawTextSummary:     string;
  mentionedDate:      string | null;
  sectionCount:       number;
  extractedTerms:     { term: string; ruleId: string }[];
} {
  // カテゴリ検出
  const detectedCategories = Object.entries(CATEGORY_KEYWORDS)
    .filter(([, keywords]) => keywords.some((kw) => text.includes(kw)))
    .map(([id]) => id);

  // テキストから日付を抽出（YYYY年MM月DD日）
  const dateJP  = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  const dateISO = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  let mentionedDate: string | null = null;
  if (dateJP) {
    mentionedDate = `${dateJP[1]}-${dateJP[2].padStart(2,"0")}-${dateJP[3].padStart(2,"0")}`;
  } else if (dateISO) {
    mentionedDate = `${dateISO[1]}-${dateISO[2].padStart(2,"0")}-${dateISO[3].padStart(2,"0")}`;
  }

  // セクション数（見出し/箇条書き）
  const sectionCount = (text.match(/^(?:#{1,3}\s|\d+\.\s|[●■・]\s)/gm) ?? []).length;

  // 禁止用語を抽出
  const extractedTerms = extractProhibitedTerms(text);

  return {
    detectedCategories,
    rawTextSummary: text.replace(/\s+/g, " ").trim().slice(0, 400),
    mentionedDate,
    sectionCount,
    extractedTerms,
  };
}

/* ------------------------------------------------------------------ */
/* x-rules.json への書き込み                                            */
/* ------------------------------------------------------------------ */

function mergeExtractedTerms(rules: XRule[], terms: { term: string; ruleId: string }[]): XRule[] {
  const updated = rules.map((rule) => {
    const newTerms = terms
      .filter((t) => t.ruleId === rule.id)
      .map((t) => escapeRegex(t.term))
      .filter((escaped) => !rule.patterns.includes(escaped));

    if (!newTerms.length) return rule;

    return { ...rule, patterns: [...rule.patterns, ...newTerms] };
  });
  return updated;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ------------------------------------------------------------------ */
/* Route handlers                                                       */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    const raw    = readFileSync(RULES_PATH, "utf-8");
    const config = JSON.parse(raw) as RulesConfig;
    const today  = new Date().toISOString().slice(0, 10);
    const lastDate = config.pasteUpdatedAt ?? config.updatedAt;
    const daysSince = Math.floor(
      (new Date(today).getTime() - new Date(lastDate).getTime()) / 86400000
    );

    return NextResponse.json({
      version:            config.version,
      updatedAt:          config.updatedAt,
      pasteUpdatedAt:     config.pasteUpdatedAt ?? null,
      rawTextSummary:     config.rawTextSummary ?? null,
      detectedCategories: config.detectedCategories ?? [],
      totalRules:         config.rules.length,
      daysSinceUpdate:    daysSince,
      isStale:            daysSince >= 30,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { pastedText?: string };
    const { pastedText } = body;

    if (!pastedText || pastedText.trim().length < 50) {
      return NextResponse.json(
        { error: "テキストが短すぎます（50文字以上貼り付けてください）" },
        { status: 400 }
      );
    }

    const raw    = readFileSync(RULES_PATH, "utf-8");
    const config = JSON.parse(raw) as RulesConfig;

    const analysis = analyzeRulesText(pastedText);
    const today    = new Date().toISOString().slice(0, 10);

    // 既存ルールに抽出用語をマージ
    const updatedRules = mergeExtractedTerms(config.rules, analysis.extractedTerms);

    const newConfig: RulesConfig = {
      ...config,
      updatedAt:          today,
      pasteUpdatedAt:     today,
      rawTextSummary:     analysis.rawTextSummary,
      detectedCategories: analysis.detectedCategories,
      rules:              updatedRules,
    };

    writeFileSync(RULES_PATH, JSON.stringify(newConfig, null, 2), "utf-8");
    clearRulesCache(); // メモリキャッシュをクリア

    return NextResponse.json({
      ok:                 true,
      updatedAt:          today,
      detectedCategories: analysis.detectedCategories,
      sectionCount:       analysis.sectionCount,
      newPatterns:        analysis.extractedTerms.length,
      mentionedDate:      analysis.mentionedDate,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "保存に失敗しました";
    console.error("[/api/settings/rules]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
