"use client";
import { useEffect, useState } from "react";
import { useAccount } from "@/contexts/AccountContext";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

type Trend = "rising" | "stable" | "declining";

type PatternLifecycle = {
  id: string;
  pattern: string;
  weight: number;
  lifeScore: number;
  trend: Trend;
  avgER7d: number | null;
  avgER30d: number | null;
  postCount7d: number;
  postCount30d: number;
};

type DriftWarning = {
  type: "genre" | "postType";
  severity: "high" | "medium";
  message: string;
  detail: string;
};

type LongTermResult = {
  risingPatterns:    PatternLifecycle[];
  stablePatterns:    PatternLifecycle[];
  decliningPatterns: PatternLifecycle[];
  driftWarnings:     DriftWarning[];
  nextPriorityPostType: string | null;
  postTypeScores:    Record<string, number>;
  insights:          string[];
  autoAdjusted:      { pattern: string; oldWeight: number; newWeight: number }[];
};

type BasicResult = {
  suggestions: { category: string; priority: string; title: string; detail: string }[];
  scorecard:   { avgER: number; trend: string; consistency: number; topPattern: string | null };
  nextActions: string[];
};

type Account = { id: string; name: string };

/* ------------------------------------------------------------------ */
/* Style maps                                                           */
/* ------------------------------------------------------------------ */

const TREND_ICON: Record<Trend, string> = {
  rising:   "↑",
  stable:   "→",
  declining: "↓",
};
const TREND_COLOR: Record<Trend, string> = {
  rising:   "text-green-400",
  stable:   "text-zinc-400",
  declining: "text-red-400",
};
const PRIORITY_COLORS: Record<string, string> = {
  high:   "border-l-red-500 bg-red-900/10",
  medium: "border-l-yellow-500 bg-yellow-900/10",
  low:    "border-l-zinc-600 bg-zinc-900",
};
const SEVERITY_COLORS: Record<string, string> = {
  high:   "border-orange-500/50 bg-orange-900/10",
  medium: "border-yellow-500/50 bg-yellow-900/10",
};
const POST_TYPE_COLORS: Record<string, string> = {
  "バズ":   "bg-orange-900/40 text-orange-400",
  "考察":   "bg-blue-900/40 text-blue-400",
  "刺さる": "bg-purple-900/40 text-purple-400",
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function PatternRow({ lc }: { lc: PatternLifecycle }) {
  const shortName = lc.pattern.split(/[：:]/)[0].trim();
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`text-base w-4 flex-none ${TREND_COLOR[lc.trend]}`}>
        {TREND_ICON[lc.trend]}
      </span>
      <span className="text-zinc-300 flex-1 min-w-0 truncate">{shortName}</span>
      <div className="flex items-center gap-2 flex-none text-xs text-zinc-500">
        {lc.avgER7d != null && (
          <span>7d {lc.avgER7d.toFixed(2)}%</span>
        )}
        {lc.avgER30d != null && (
          <span className="text-zinc-600">30d {lc.avgER30d.toFixed(2)}%</span>
        )}
        <span className={`font-mono font-semibold ml-1 ${
          lc.weight >= 2.0 ? "text-green-400" :
          lc.weight >= 1.5 ? "text-blue-400"  :
          lc.weight < 1.0  ? "text-red-400"   : "text-zinc-400"
        }`}>
          w{lc.weight.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* OptimizePage                                                         */
/* ------------------------------------------------------------------ */

export default function OptimizePage() {
  const { account } = useAccount();
  const [accounts,    setAccounts]    = useState<Account[]>([]);
  const [accountId,   setAccountId]   = useState("");
  const [period,      setPeriod]      = useState("month");
  const [loading,     setLoading]     = useState(false);
  const [ltResult,    setLtResult]    = useState<LongTermResult | null>(null);
  const [basicResult, setBasicResult] = useState<BasicResult | null>(null);

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
  }, []);

  useEffect(() => {
    if (account?.id && !accountId) setAccountId(account.id);
  }, [account]);

  async function runOptimization() {
    setLoading(true);
    setLtResult(null);
    setBasicResult(null);

    const qs = new URLSearchParams({ period });
    if (accountId) qs.set("accountId", accountId);

    const [lt, basic] = await Promise.all([
      fetch(`/api/optimize/long-term?${qs}`).then((r) => r.json()),
      fetch(`/api/optimize?${qs}`).then((r) => r.json()),
    ]);

    setLtResult(lt);
    setBasicResult(basic);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">長期最適化</h1>
        <div className="flex gap-3 items-center">
          <select
            className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">全アカウント</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select
            className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="week">1週間</option>
            <option value="month">1ヶ月</option>
            <option value="quarter">3ヶ月</option>
          </select>
          <button
            onClick={runOptimization}
            disabled={loading}
            className="text-sm px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-md transition-colors"
          >
            {loading ? "分析中..." : "最適化を実行"}
          </button>
        </div>
      </div>

      {!ltResult && !basicResult && !loading && (
        <div className="text-center py-16 text-zinc-600">
          <div className="text-4xl mb-3">🚀</div>
          <div>「最適化を実行」で分析を開始します</div>
          <div className="text-xs mt-1">パターン重みの自動調整も同時に行われます</div>
        </div>
      )}

      {ltResult && (
        <div className="space-y-5">

          {/* ── インサイト ── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <h2 className="font-semibold text-sm mb-3">インサイト</h2>
            <ul className="space-y-2">
              {ltResult.insights.map((s, i) => (
                <li key={i} className="text-sm text-zinc-300 flex gap-2">
                  <span className="text-blue-500 flex-none">•</span>{s}
                </li>
              ))}
            </ul>
          </div>

          {/* ── パターン3カラム ── */}
          <div className="grid md:grid-cols-3 gap-4">

            {/* 今強いパターン */}
            <div className="bg-zinc-900 border border-green-800/40 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-green-400 text-lg">↑</span>
                <h2 className="font-semibold text-sm">今強いパターン</h2>
                <span className="text-xs text-zinc-600 ml-auto">{ltResult.risingPatterns.length}件</span>
              </div>
              {ltResult.risingPatterns.length > 0 ? (
                <div className="space-y-2.5">
                  {ltResult.risingPatterns.slice(0, 5).map((lc) => (
                    <PatternRow key={lc.id} lc={lc} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-600">上昇中のパターンなし</p>
              )}
            </div>

            {/* 安定強パターン */}
            <div className="bg-zinc-900 border border-blue-800/40 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-blue-400 text-lg">→</span>
                <h2 className="font-semibold text-sm">安定している強いパターン</h2>
                <span className="text-xs text-zinc-600 ml-auto">{ltResult.stablePatterns.length}件</span>
              </div>
              {ltResult.stablePatterns.length > 0 ? (
                <div className="space-y-2.5">
                  {ltResult.stablePatterns.slice(0, 5).map((lc) => (
                    <PatternRow key={lc.id} lc={lc} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-600">安定強パターンなし</p>
              )}
            </div>

            {/* 弱くなっているパターン */}
            <div className="bg-zinc-900 border border-red-800/40 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-red-400 text-lg">↓</span>
                <h2 className="font-semibold text-sm">弱くなっているパターン</h2>
                <span className="text-xs text-zinc-600 ml-auto">{ltResult.decliningPatterns.length}件</span>
              </div>
              {ltResult.decliningPatterns.length > 0 ? (
                <div className="space-y-2.5">
                  {ltResult.decliningPatterns.slice(0, 5).map((lc) => (
                    <PatternRow key={lc.id} lc={lc} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-600">低下パターンなし</p>
              )}
            </div>
          </div>

          {/* ── 次に優先すべき投稿タイプ ── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <h2 className="font-semibold text-sm mb-3">次に優先すべき投稿タイプ</h2>
            <div className="flex flex-wrap items-center gap-4">
              {Object.entries(ltResult.postTypeScores)
                .sort((a, b) => b[1] - a[1])
                .map(([type, score], i) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${POST_TYPE_COLORS[type] ?? "bg-zinc-800 text-zinc-400"} ${
                      type === ltResult.nextPriorityPostType ? "ring-2 ring-offset-1 ring-offset-zinc-900 ring-current" : ""
                    }`}>
                      {type}
                    </span>
                    <span className="text-xs text-zinc-500">ER {score.toFixed(2)}%</span>
                    {i === 0 && ltResult.nextPriorityPostType === type && (
                      <span className="text-xs bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">おすすめ</span>
                    )}
                  </div>
                ))}
              {Object.keys(ltResult.postTypeScores).length === 0 && (
                <p className="text-xs text-zinc-600">投稿タイプ別データが不足しています</p>
              )}
            </div>
          </div>

          {/* ── ドリフト警告 ── */}
          {ltResult.driftWarnings.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-semibold text-sm">ドリフト警告</h2>
              {ltResult.driftWarnings.map((w, i) => (
                <div key={i} className={`border rounded-lg p-4 ${SEVERITY_COLORS[w.severity]}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-orange-400">
                      {w.severity === "high" ? "⚠ HIGH" : "! MEDIUM"}
                    </span>
                    <span className="text-sm font-medium text-zinc-200">{w.message}</span>
                  </div>
                  <p className="text-xs text-zinc-400">{w.detail}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── 自動調整ログ ── */}
          {ltResult.autoAdjusted.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h2 className="text-sm font-semibold mb-3">自動 weight 調整</h2>
              <div className="space-y-1.5">
                {ltResult.autoAdjusted.map((adj, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 truncate">{adj.pattern.split(/[：:]/)[0]}</span>
                    <span className={`font-mono ml-2 ${adj.newWeight > adj.oldWeight ? "text-green-400" : "text-red-400"}`}>
                      {adj.oldWeight.toFixed(1)} → {adj.newWeight.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 基本提案（既存） ── */}
      {basicResult && (
        <div className="space-y-4 pt-2 border-t border-zinc-800">
          <h2 className="font-semibold text-sm text-zinc-400">基本分析</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "平均ER",      value: `${basicResult.scorecard.avgER}%`, color: "text-blue-400" },
              { label: "トレンド",    value: basicResult.scorecard.trend,        color: "text-zinc-300" },
              { label: "一貫性",      value: `${basicResult.scorecard.consistency}%`, color: "text-green-400" },
              { label: "トップパターン", value: basicResult.scorecard.topPattern?.split(/[：:]/)[0] ?? "-", color: "text-purple-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                <div className={`font-bold text-lg ${color}`}>{value}</div>
                <div className="text-xs text-zinc-600 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {basicResult.suggestions.slice(0, 3).map((s, i) => (
              <div key={i} className={`border-l-4 rounded-r-lg p-3 ${PRIORITY_COLORS[s.priority]}`}>
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-xs text-zinc-400 mt-0.5">{s.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
