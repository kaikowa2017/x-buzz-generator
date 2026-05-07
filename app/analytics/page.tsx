"use client";
import { useEffect, useState } from "react";
import { useAccount } from "@/contexts/AccountContext";

type AnalyticsResult = {
  totalPosts: number;
  avgEngagementRate: number;
  topPost: { content: string; er: number } | null;
  engagementTrend: "up" | "down" | "flat";
  bestGenre: string | null;
  bestHour: number | null;
  insights: string[];
};

type Account = { id: string; name: string };

const TREND_ICONS = { up: "↑ 上昇", down: "↓ 下降", flat: "→ 安定" };
const TREND_COLORS = { up: "text-green-400", down: "text-red-400", flat: "text-zinc-400" };

export default function AnalyticsPage() {
  const { account } = useAccount();
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [learning, setLearning] = useState(false);
  const [learnResult, setLearnResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
    loadAnalytics("");
  }, []);

  useEffect(() => {
    if (account?.id && !accountId) {
      setAccountId(account.id);
      loadAnalytics(account.id);
    }
  }, [account]);

  async function loadAnalytics(aid: string) {
    setLoading(true);
    const url = aid ? `/api/analytics?accountId=${aid}` : "/api/analytics";
    const data = await fetch(url).then((r) => r.json());
    setResult(data);
    setLoading(false);
  }

  async function runLearning() {
    setLearning(true);
    setLearnResult(null);
    const res = await fetch("/api/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: accountId || undefined }),
    });
    const data = await res.json();
    setLearnResult(`${data.learned}パターンを学習しました`);
    setLearning(false);
  }

  function onAccountChange(aid: string) {
    setAccountId(aid);
    loadAnalytics(aid);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">分析</h1>
        <div className="flex gap-3 items-center">
          <select
            className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm focus:outline-none"
            value={accountId}
            onChange={(e) => onAccountChange(e.target.value)}
          >
            <option value="">全アカウント</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button
            onClick={runLearning}
            disabled={learning}
            className="text-sm px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 rounded-md transition-colors"
          >
            {learning ? "学習中..." : "学習を実行"}
          </button>
        </div>
      </div>

      {learnResult && (
        <div className="bg-purple-900/30 border border-purple-700 rounded-md px-4 py-2 text-sm text-purple-400">
          {learnResult}
        </div>
      )}

      {loading ? (
        <div className="text-zinc-500 text-sm">分析中...</div>
      ) : result ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="text-3xl font-bold">{result.totalPosts}</div>
              <div className="text-xs text-zinc-500 mt-1">計測済み投稿</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-400">{result.avgEngagementRate}%</div>
              <div className="text-xs text-zinc-500 mt-1">平均ER</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className={`text-xl font-bold mt-1 ${TREND_COLORS[result.engagementTrend]}`}>
                {TREND_ICONS[result.engagementTrend]}
              </div>
              <div className="text-xs text-zinc-500 mt-1">トレンド</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-400">{result.bestHour != null ? `${result.bestHour}時` : "-"}</div>
              <div className="text-xs text-zinc-500 mt-1">最適投稿時間</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
              <h2 className="font-semibold text-sm mb-3">インサイト</h2>
              <ul className="space-y-2">
                {result.insights.map((insight, i) => (
                  <li key={i} className="text-sm text-zinc-400 flex gap-2">
                    <span className="text-blue-500 flex-none">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
              <h2 className="font-semibold text-sm mb-3">ベスト情報</h2>
              <div className="space-y-3 text-sm">
                {result.bestGenre && (
                  <div>
                    <div className="text-xs text-zinc-500">最高ERジャンル</div>
                    <div className="text-green-400 font-medium">{result.bestGenre}</div>
                  </div>
                )}
                {result.topPost && (
                  <div>
                    <div className="text-xs text-zinc-500">トップ投稿</div>
                    <div className="text-zinc-300 text-xs line-clamp-3">{result.topPost.content}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
