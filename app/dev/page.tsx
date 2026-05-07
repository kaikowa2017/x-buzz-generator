"use client";
import { useState } from "react";
import Link from "next/link";

type CheckResult = {
  name: string;
  ok: boolean;
  detail: string;
  data?: Record<string, unknown> | unknown[];
};

type VerifyResult = {
  ok: boolean;
  checks: CheckResult[];
};

const FLOW_STEPS = [
  { icon: "✏️", label: "投稿生成 → 保存",     href: "/generate",  desc: "ジャンル・タイプを選んでClaude生成、保存を押す" },
  { icon: "📊", label: "数値入力 → 判定",     href: "/history",   desc: "投稿カードの「分析」から数値を入力、保存 & 学習" },
  { icon: "📈", label: "分析確認",            href: "/analytics", desc: "アカウント別のER・トレンドを確認" },
  { icon: "🔥", label: "バズ分析 → 学習",     href: "/buzz",      desc: "バズ投稿を分析してパターンを学習に追加" },
  { icon: "🚀", label: "長期最適化",          href: "/optimize",  desc: "最適化を実行してパターンの自動調整を確認" },
  { icon: "✏️", label: "次回生成で反映確認",  href: "/generate",  desc: "重みの高いパターンが学習済みとして注入される" },
];

export default function DevPage() {
  const [seeding,   setSeeding]   = useState(false);
  const [seedDone,  setSeedDone]  = useState(false);
  const [seedData,  setSeedData]  = useState<Record<string, unknown> | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result,    setResult]    = useState<VerifyResult | null>(null);
  const [expanded,  setExpanded]  = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderData(data: unknown): string { return JSON.stringify(data as any, null, 2); }

  async function seed() {
    setSeeding(true);
    setSeedDone(false);
    setResult(null);
    const res = await fetch("/api/dev/seed", { method: "POST" });
    const data = await res.json();
    setSeedData(data.summary);
    setSeedDone(true);
    setSeeding(false);
  }

  async function verify() {
    setVerifying(true);
    const res = await fetch("/api/dev/verify");
    setResult(await res.json());
    setVerifying(false);
    setExpanded(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">フロー検証</h1>
          <p className="text-xs text-zinc-500 mt-1">全機能の接続をダミーデータで確認します</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={seed}
            disabled={seeding}
            className="text-sm px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 rounded-md transition-colors"
          >
            {seeding ? "投入中..." : "① シードデータ投入"}
          </button>
          <button
            onClick={verify}
            disabled={verifying}
            className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-md transition-colors"
          >
            {verifying ? "検証中..." : "② フロー検証"}
          </button>
        </div>
      </div>

      {/* シード完了表示 */}
      {seedDone && seedData && (
        <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
          <div className="text-sm font-medium text-purple-400 mb-2">シードデータ投入完了</div>
          <pre className="text-xs text-zinc-400 overflow-auto">
            {renderData(seedData)}
          </pre>
        </div>
      )}

      {/* フロー図 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <div className="text-sm font-semibold mb-4 text-zinc-400">全体フロー</div>
        <div className="flex flex-wrap gap-2 items-center">
          {FLOW_STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <Link
                href={s.href}
                className="group flex flex-col items-center bg-zinc-800 hover:bg-zinc-700 rounded-lg p-3 transition-colors text-center w-28"
              >
                <span className="text-lg">{s.icon}</span>
                <span className="text-xs text-zinc-300 mt-1 leading-tight">{s.label}</span>
                <span className="text-xs text-zinc-600 mt-1 leading-tight hidden group-hover:block">{s.desc}</span>
              </Link>
              {i < FLOW_STEPS.length - 1 && (
                <span className="text-zinc-700 text-lg">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 検証結果 */}
      {result && (
        <div className="space-y-3">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
            result.ok
              ? "bg-green-900/20 border-green-700/50 text-green-400"
              : "bg-red-900/20 border-red-700/50 text-red-400"
          }`}>
            <span className="text-xl">{result.ok ? "✓" : "✗"}</span>
            <span className="font-semibold">
              {result.ok ? "全フロー正常に接続されています" : "一部の接続に問題があります"}
            </span>
            <span className="text-xs ml-auto">
              {result.checks.filter(c => c.ok).length} / {result.checks.length} チェック通過
            </span>
          </div>

          {result.checks.map((check, i) => (
            <div
              key={i}
              className={`border rounded-lg overflow-hidden ${
                check.ok ? "border-zinc-800" : "border-red-700/50"
              }`}
            >
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left bg-zinc-900 hover:bg-zinc-800 transition-colors"
              >
                <span className={`text-sm font-medium w-4 ${check.ok ? "text-green-400" : "text-red-400"}`}>
                  {check.ok ? "✓" : "✗"}
                </span>
                <span className="text-sm font-medium flex-1">{check.name}</span>
                <span className="text-xs text-zinc-500 flex-1 text-right pr-4 truncate">{check.detail}</span>
                <span className="text-xs text-zinc-600">{expanded === i ? "▲" : "▼"}</span>
              </button>

              {expanded === i && check.data != null && (
                <div className="px-4 pb-4 bg-zinc-950 border-t border-zinc-800">
                  <pre className="text-xs text-zinc-400 mt-3 overflow-auto max-h-60 leading-relaxed">
                    {renderData(check.data)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* クイックリンク */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <div className="text-sm font-semibold mb-3 text-zinc-400">クイックリンク（シード後に確認）</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { href: "/generate",    label: "投稿生成",     desc: "horror_test でパターンが注入されるか" },
            { href: "/history",     label: "投稿履歴",     desc: "アカウントごとに3件/1件で独立" },
            { href: "/metrics",     label: "数値入力(旧)",  desc: "メトリクスの直接入力" },
            { href: "/history",     label: "分析(履歴内)",  desc: "「分析」ボタンで判定・学習" },
            { href: "/analytics",   label: "分析ページ",   desc: "ER・トレンド・最適時間" },
            { href: "/optimize",    label: "長期最適化",   desc: "rising/declining パターン" },
            { href: "/buzz",        label: "バズ分析",     desc: "バズ投稿DB確認" },
            { href: "/accounts",    label: "アカウント",   desc: "horror_test / biz_test の切替" },
          ].map(({ href, label, desc }) => (
            <Link
              key={label}
              href={href}
              className="flex flex-col p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <span className="text-sm font-medium text-zinc-200">{label}</span>
              <span className="text-xs text-zinc-500 mt-0.5">{desc}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 注意書き */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-500 space-y-1">
        <div className="font-medium text-zinc-400">シードデータについて</div>
        <div>・シードは何度実行しても重複しません（upsert）</div>
        <div>・テストアカウントは horror_test / biz_test のハンドルで識別</div>
        <div>・シード後、サイドバーのアカウント欄が「ホラー編集長[TEST]」に切り替わります</div>
        <div>・本番データには影響しません</div>
      </div>
    </div>
  );
}
