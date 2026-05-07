"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAccount, type AccountInfo } from "@/contexts/AccountContext";

const NAV = [
  { href: "/", label: "ダッシュボード", icon: "⬛" },
  { href: "/generate", label: "投稿生成", icon: "✏️" },
  { href: "/image-prompts", label: "画像プロンプト", icon: "🖼" },
  { href: "/video-prompts", label: "動画プロンプト", icon: "🎬" },
  { href: "/history",  label: "投稿履歴",   icon: "📋" },
  { href: "/calendar", label: "カレンダー", icon: "📅" },
  { href: "/metrics", label: "数値入力", icon: "📊" },
  { href: "/analytics", label: "分析", icon: "📈" },
  { href: "/buzz", label: "バズ分析", icon: "🔥" },
  { href: "/optimize", label: "長期最適化", icon: "🚀" },
  { href: "/accounts", label: "アカウント管理", icon: "👤" },
  { href: "/genres", label: "ジャンル", icon: "🏷" },
  { href: "/settings", label: "設定", icon: "⚙️" },
  { href: "/dev", label: "フロー検証", icon: "🧪" },
];

function AccountSwitcher() {
  const { account, setAccount, clearAccount } = useAccount();
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then(setAccounts);
  }, []);

  // 外部クリックで閉じる
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function switchTo(a: AccountInfo & { isActive?: boolean }) {
    // DBのisActiveを更新
    await fetch(`/api/accounts/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    setAccount({ id: a.id, name: a.name, handle: a.handle });
    // 他のアカウントのisActiveをローカルで更新
    setAccounts((prev) => prev.map((acc) => ({ ...acc, isActive: acc.id === a.id })));
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative px-3 py-2.5 border-b border-zinc-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 text-left group"
      >
        <div className="w-7 h-7 rounded-full bg-blue-700/50 flex items-center justify-center text-xs font-bold text-blue-300 flex-none">
          {account ? account.name[0].toUpperCase() : "?"}
        </div>
        <div className="flex-1 min-w-0">
          {account ? (
            <>
              <div className="text-xs font-medium text-zinc-200 truncate">{account.name}</div>
              <div className="text-xs text-zinc-600 truncate">@{account.handle}</div>
            </>
          ) : (
            <div className="text-xs text-zinc-500">アカウント未選択</div>
          )}
        </div>
        <svg
          className={`w-3 h-3 text-zinc-600 flex-none transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-50 overflow-hidden">
          {accounts.length === 0 ? (
            <div className="px-3 py-2 text-xs text-zinc-500">アカウントなし</div>
          ) : (
            accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => switchTo(a)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-700 transition-colors ${
                  account?.id === a.id ? "bg-blue-900/30" : ""
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 flex-none">
                  {a.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-zinc-200 truncate">{a.name}</div>
                  <div className="text-xs text-zinc-600 truncate">@{a.handle}</div>
                </div>
                {account?.id === a.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-none" />
                )}
              </button>
            ))
          )}
          <div className="border-t border-zinc-700 px-3 py-1.5">
            <Link
              href="/accounts"
              onClick={() => setOpen(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              + アカウント管理
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 flex-none bg-zinc-900 border-r border-zinc-800 flex flex-col h-full">
      <div className="px-4 py-4 border-b border-zinc-800">
        <span className="text-sm font-bold text-blue-400">X投稿マネージャー</span>
      </div>
      <AccountSwitcher />
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-4 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-blue-600/20 text-blue-400 font-medium"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              }`}
            >
              <span className="w-4 text-center">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-zinc-800 text-xs text-zinc-600">
        localhost:3002
      </div>
    </aside>
  );
}
