"use client";
import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

type KeyStatus = {
  hasKey:    boolean;
  source:    "db" | "env" | "none";
  maskedKey: string | null;
};

type RulesMeta = {
  version:            string;
  updatedAt:          string;
  pasteUpdatedAt:     string | null;
  rawTextSummary:     string | null;
  detectedCategories: string[];
  totalRules:         number;
  daysSinceUpdate:    number;
  isStale:            boolean;
};

const CATEGORY_NAMES: Record<string, string> = {
  violence_direct:           "暴力的/脅迫",
  hate_speech:               "ヘイト/差別",
  harassment:                "ハラスメント",
  personal_info:             "個人情報",
  adult_content:             "成人向け",
  self_harm:                 "自傷/危険行為",
  scam_fraud:                "詐欺/誤情報",
  election_manipulation:     "選挙誘導",
  spam_excessive_cta:        "スパム",
  impersonation:             "なりすまし",
  illegal_goods:             "違法商品",
  ai_image_misrepresentation:"AI誤認リスク",
};

type BudgetStatus = {
  budgetJpy:    number;
  usageJpy:     number;
  usageUsd:     number;
  remainingJpy: number | null;
  percentage:   number | null;
  isUnlimited:  boolean;
  isOverBudget: boolean;
  today:        string;
};

/* ------------------------------------------------------------------ */
/* Style maps                                                           */
/* ------------------------------------------------------------------ */

const SOURCE_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  db:   { label: "設定済み（DB保存）",   color: "text-green-400",  bg: "bg-green-900/30 border-green-700" },
  env:  { label: "設定済み（環境変数）", color: "text-yellow-400", bg: "bg-yellow-900/30 border-yellow-700" },
  none: { label: "未設定",              color: "text-red-400",    bg: "bg-red-900/30 border-red-700" },
};

const BUDGET_PRESETS = [
  { label: "¥300",  value: 300  },
  { label: "¥500",  value: 500  },
  { label: "¥1,000", value: 1000 },
  { label: "無制限", value: 0   },
];

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  // APIキー
  const [keyStatus,   setKeyStatus]   = useState<KeyStatus | null>(null);
  const [input,       setInput]       = useState("");
  const [show,        setShow]        = useState(false);
  const [savingKey,   setSavingKey]   = useState(false);
  const [deletingKey, setDeletingKey] = useState(false);
  const [keyMsg,      setKeyMsg]      = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // 予算
  const [budget,       setBudget]       = useState<BudgetStatus | null>(null);
  const [budgetInput,  setBudgetInput]  = useState<string>("");
  const [savingBudget, setSavingBudget] = useState(false);
  const [resetting,    setResetting]    = useState(false);
  const [budgetMsg,    setBudgetMsg]    = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Xルール
  const [rulesMeta,   setRulesMeta]   = useState<RulesMeta | null>(null);
  const [pastedRules, setPastedRules] = useState("");
  const [savingRules, setSavingRules] = useState(false);
  const [rulesMsg,    setRulesMsg]    = useState<{ type: "ok" | "err"; text: string; detail?: string } | null>(null);

  useEffect(() => {
    loadKeyStatus();
    loadBudget();
    loadRulesMeta();
  }, []);

  /* ── APIキー ── */
  async function loadKeyStatus() {
    const res  = await fetch("/api/settings");
    const data = await res.json();
    setKeyStatus(data);
  }

  async function saveKey() {
    if (!input.trim()) return;
    setSavingKey(true);
    setKeyMsg(null);
    const res  = await fetch("/api/settings", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ apiKey: input.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setKeyMsg({ type: "ok", text: `保存しました: ${data.maskedKey}` });
      setInput("");
      await loadKeyStatus();
    } else {
      setKeyMsg({ type: "err", text: data.error ?? "保存に失敗しました" });
    }
    setSavingKey(false);
  }

  async function deleteDbKey() {
    if (!confirm("DB保存のAPIキーを削除しますか？")) return;
    setDeletingKey(true);
    setKeyMsg(null);
    const res = await fetch("/api/settings", { method: "DELETE" });
    if (res.ok) {
      setKeyMsg({ type: "ok", text: "DBキーを削除しました" });
      await loadKeyStatus();
    } else {
      setKeyMsg({ type: "err", text: "削除に失敗しました" });
    }
    setDeletingKey(false);
  }

  /* ── 予算 ── */
  async function loadBudget() {
    const res  = await fetch("/api/settings/budget");
    const data = await res.json();
    setBudget(data);
    setBudgetInput(data.budgetJpy > 0 ? String(data.budgetJpy) : "");
  }

  async function saveBudget(yen: number) {
    setSavingBudget(true);
    setBudgetMsg(null);
    const res = await fetch("/api/settings/budget", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ budgetJpy: yen }),
    });
    const data = await res.json();
    if (res.ok) {
      setBudgetMsg({ type: "ok", text: yen === 0 ? "上限を無制限に設定しました" : `上限を ¥${yen.toLocaleString()} に設定しました` });
      await loadBudget();
    } else {
      setBudgetMsg({ type: "err", text: data.error ?? "保存に失敗しました" });
    }
    setSavingBudget(false);
  }

  async function resetUsage() {
    if (!confirm("今日の利用額をリセットしますか？")) return;
    setResetting(true);
    await fetch("/api/settings/budget", { method: "DELETE" });
    setBudgetMsg({ type: "ok", text: "今日の利用額をリセットしました" });
    await loadBudget();
    setResetting(false);
  }

  /* ── Xルール ── */
  async function loadRulesMeta() {
    try {
      const res  = await fetch("/api/settings/rules");
      const data = await res.json();
      setRulesMeta(data);
    } catch {}
  }

  async function saveRules() {
    if (!pastedRules.trim()) return;
    setSavingRules(true);
    setRulesMsg(null);
    const res  = await fetch("/api/settings/rules", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ pastedText: pastedRules }),
    });
    const data = await res.json();
    if (res.ok) {
      const detail = [
        `カテゴリ検出: ${(data.detectedCategories as string[]).length}件`,
        data.newPatterns > 0 ? `新パターン追加: ${data.newPatterns}件` : "",
        data.mentionedDate ? `テキスト内の日付: ${data.mentionedDate}` : "",
      ].filter(Boolean).join(" / ");
      setRulesMsg({ type: "ok", text: "ルールを保存しました", detail });
      setPastedRules("");
      await loadRulesMeta();
    } else {
      setRulesMsg({ type: "err", text: data.error ?? "保存に失敗しました" });
    }
    setSavingRules(false);
  }

  const src    = keyStatus?.source ?? "none";
  const kStyle = SOURCE_LABEL[src];

  const pct         = budget?.percentage ?? 0;
  const barColor    =
    pct >= 100 ? "bg-red-500" :
    pct >= 80  ? "bg-orange-500" :
    pct >= 50  ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-xs text-zinc-500 mt-1">Claude API キーとAPI利用量の管理</p>
      </div>

      {/* ══════════════════════════════════════════════
          APIキーセクション
      ══════════════════════════════════════════════ */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2">Claude APIキー</h2>

        {/* 現在の状態 */}
        <div className={`rounded-lg border p-4 ${kStyle.bg}`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-none ${
              src === "db" ? "bg-green-400" : src === "env" ? "bg-yellow-400" : "bg-red-400"
            }`} />
            <span className={`text-sm font-medium ${kStyle.color}`}>{kStyle.label}</span>
          </div>
          {keyStatus?.maskedKey && (
            <div className="mt-2 font-mono text-xs text-zinc-400 bg-zinc-900/50 px-3 py-1.5 rounded">
              {keyStatus.maskedKey}
            </div>
          )}
          {src === "env" && (
            <p className="mt-2 text-xs text-zinc-500">
              .env の <code className="text-zinc-400">ANTHROPIC_API_KEY</code> を使用中。
              下記で登録するとDB設定が優先されます。
            </p>
          )}
          {src === "none" && (
            <p className="mt-2 text-xs text-red-400">
              未設定。Claude生成・バズ分析は使用できません。
            </p>
          )}
        </div>

        {/* 入力フォーム */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 pr-16 text-sm font-mono focus:outline-none focus:border-blue-500"
              placeholder="sk-ant-api03-..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveKey()}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1"
            >
              {show ? "隠す" : "表示"}
            </button>
          </div>
          {keyMsg && (
            <div className={`text-xs px-3 py-2 rounded-md ${
              keyMsg.type === "ok" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
            }`}>{keyMsg.text}</div>
          )}
          <div className="flex gap-2">
            <button
              onClick={saveKey}
              disabled={!input.trim() || savingKey}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md py-1.5 text-sm font-medium transition-colors"
            >
              {savingKey ? "保存中..." : "保存"}
            </button>
            {src === "db" && (
              <button
                onClick={deleteDbKey}
                disabled={deletingKey}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-red-900/60 text-zinc-400 hover:text-red-400 rounded-md text-sm transition-colors disabled:opacity-50"
              >
                {deletingKey ? "削除中..." : "削除"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          API利用上限セクション
      ══════════════════════════════════════════════ */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2">1日のAPI利用上限</h2>

        {/* 上限到達バナー */}
        {budget?.isOverBudget && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-400 font-medium">
            今日は上限に達しました（¥{budget.budgetJpy.toLocaleString()}）。明日になると自動でリセットされます。
          </div>
        )}

        {/* 今日の利用状況 */}
        {budget && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">今日の利用額</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-zinc-200">
                  ¥{budget.usageJpy.toLocaleString()}
                </span>
                {!budget.isUnlimited && (
                  <span className="text-zinc-600">/ ¥{budget.budgetJpy.toLocaleString()}</span>
                )}
              </div>
            </div>

            {/* プログレスバー */}
            {!budget.isUnlimited && (
              <div className="space-y-1">
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-600">
                  <span>{pct}% 使用</span>
                  {budget.remainingJpy != null && (
                    <span>残り ¥{budget.remainingJpy.toLocaleString()}</span>
                  )}
                </div>
              </div>
            )}

            {budget.isUnlimited && (
              <div className="text-xs text-zinc-600">上限なし（無制限）</div>
            )}

            <div className="flex items-center justify-between text-xs text-zinc-600">
              <span>参考: 約 ${budget.usageUsd.toFixed(5)} USD（1USD≒150円）</span>
              <button
                onClick={loadBudget}
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                更新
              </button>
            </div>
          </div>
        )}

        {/* 上限設定 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="text-xs text-zinc-500">プリセットから選択</div>
          <div className="grid grid-cols-4 gap-2">
            {BUDGET_PRESETS.map(({ label, value }) => {
              const active = budget?.budgetJpy === value;
              return (
                <button
                  key={value}
                  onClick={() => saveBudget(value)}
                  disabled={savingBudget}
                  className={`py-2 rounded-md border text-sm font-medium transition-colors disabled:opacity-50 ${
                    active
                      ? "bg-blue-700 border-blue-500 text-white"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs text-zinc-500 flex-none">¥</span>
              <input
                type="number"
                min="0"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                placeholder="カスタム金額"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveBudget(Number(budgetInput) || 0)}
              />
            </div>
            <button
              onClick={() => saveBudget(Number(budgetInput) || 0)}
              disabled={savingBudget || !budgetInput}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-md text-sm font-medium transition-colors"
            >
              設定
            </button>
          </div>

          {budgetMsg && (
            <div className={`text-xs px-3 py-2 rounded-md ${
              budgetMsg.type === "ok" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
            }`}>{budgetMsg.text}</div>
          )}

          <button
            onClick={resetUsage}
            disabled={resetting || budget?.usageJpy === 0}
            className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded-md text-xs text-zinc-400 transition-colors"
          >
            {resetting ? "リセット中..." : "今日の利用額を手動リセット"}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          Xルール管理セクション
      ══════════════════════════════════════════════ */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2">
          Xルール管理
        </h2>

        {/* 現在のルール状態 */}
        {rulesMeta && (
          <div className={`rounded-lg border p-4 space-y-2 ${
            rulesMeta.isStale
              ? "bg-orange-900/20 border-orange-700/50"
              : "bg-zinc-900 border-zinc-800"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${rulesMeta.isStale ? "bg-orange-400" : "bg-green-400"}`} />
                <span className={`text-sm font-medium ${rulesMeta.isStale ? "text-orange-400" : "text-zinc-200"}`}>
                  {rulesMeta.isStale ? `${rulesMeta.daysSinceUpdate}日間未更新` : "最新の状態"}
                </span>
              </div>
              <span className="text-xs text-zinc-500">
                最終更新: {rulesMeta.pasteUpdatedAt ?? rulesMeta.updatedAt}
              </span>
            </div>

            {rulesMeta.isStale && (
              <p className="text-xs text-orange-300">
                30日以上ルールが更新されていません。X公式ポリシーを確認して最新の内容を貼り付けてください。
              </p>
            )}

            <div className="flex flex-wrap gap-1 pt-1">
              {Object.keys(CATEGORY_NAMES).map((id) => {
                const covered = rulesMeta.detectedCategories.includes(id);
                return (
                  <span key={id} className={`text-xs px-1.5 py-0.5 rounded ${
                    covered ? "bg-blue-900/40 text-blue-400" : "bg-zinc-800 text-zinc-600"
                  }`}>
                    {CATEGORY_NAMES[id]}
                  </span>
                );
              })}
            </div>

            <div className="flex gap-4 text-xs text-zinc-600 pt-1">
              <span>ルール数: {rulesMeta.totalRules}件</span>
              <span>v{rulesMeta.version}</span>
            </div>

            {rulesMeta.rawTextSummary && (
              <details className="text-xs text-zinc-600">
                <summary className="cursor-pointer hover:text-zinc-400">貼り付けテキストのプレビュー</summary>
                <p className="mt-1.5 text-zinc-500 leading-relaxed">{rulesMeta.rawTextSummary}</p>
              </details>
            )}
          </div>
        )}

        {/* 貼り付けフォーム */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm text-zinc-300 mb-1">X公式ポリシーを貼り付け</label>
            <p className="text-xs text-zinc-500 mb-2">
              <a
                href="https://help.twitter.com/ja/rules-and-policies"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                X ヘルプセンター
              </a>
              {" "}からルール文章をコピーして貼り付けてください。保存すると自動で分類されます。
            </p>
            <textarea
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 h-36 resize-none font-mono"
              placeholder={"X利用規約やポリシーのテキストをここに貼り付けてください。\n例：\nXは暴力的な脅し、ヘイトスピーチ、スパムを禁止しています...\n\n（外部APIは使用しません。ローカルで処理されます）"}
              value={pastedRules}
              onChange={(e) => setPastedRules(e.target.value)}
            />
            <div className="text-xs text-zinc-600 mt-1 text-right">{pastedRules.length} 文字</div>
          </div>

          {rulesMsg && (
            <div className={`text-xs px-3 py-2 rounded-md space-y-0.5 ${
              rulesMsg.type === "ok" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
            }`}>
              <div>{rulesMsg.text}</div>
              {rulesMsg.detail && <div className="text-xs opacity-70">{rulesMsg.detail}</div>}
            </div>
          )}

          <button
            onClick={saveRules}
            disabled={!pastedRules.trim() || savingRules}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md py-1.5 text-sm font-medium transition-colors"
          >
            {savingRules ? "分類・保存中..." : "分類して保存"}
          </button>
        </div>

        {/* 説明 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-500 space-y-1.5">
          <div className="font-medium text-zinc-400">処理の仕組み（APIなし・完全ローカル）</div>
          <div>・貼り付けたテキストをキーワードで分類（外部API不使用）</div>
          <div>・禁止用語として言及されたフレーズをパターンに追加</div>
          <div>・処理結果は <code className="text-zinc-400">rules/x-rules.json</code> に保存</div>
          <div>・30日ごとの手動更新を推奨（X公式ポリシーは随時更新されます）</div>
        </div>
      </div>

      {/* 説明 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-500 space-y-2">
        <div className="font-medium text-zinc-400">APIコスト参考（Claude Sonnet 4.6）</div>
        <div className="grid grid-cols-2 gap-1">
          <span>入力トークン</span><span className="text-zinc-400">$3.00 / 1M tokens ≈ ¥0.00045/千token</span>
          <span>出力トークン</span><span className="text-zinc-400">$15.00 / 1M tokens ≈ ¥0.0023/千token</span>
        </div>
        <div className="text-zinc-600 pt-1">
          ・1回の生成: 概算 ¥0.5〜2円 程度<br/>
          ・日付が変わると自動でリセットされます
        </div>
      </div>
    </div>
  );
}
