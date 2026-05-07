"use client";
import { useEffect, useState } from "react";
import { useAccount } from "@/contexts/AccountContext";

type PatternStat = { pattern: string; weight: number; strongCount: number; weakCount: number };
type Account = {
  id: string;
  name: string;
  handle: string;
  bio: string | null;
  style: string | null;
  isActive: boolean;
  _count?: { posts: number; patterns: number };
  topPatterns?: PatternStat[];
};

export default function AccountsPage() {
  const { account: activeAccount, setAccount } = useAccount();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name,    setName]    = useState("");
  const [handle,  setHandle]  = useState("");
  const [bio,     setBio]     = useState("");
  const [style,   setStyle]   = useState("");
  const [editing, setEditing] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [patternMap, setPatternMap] = useState<Record<string, PatternStat[]>>({});
  const [ngWordMap,  setNgWordMap]  = useState<Record<string, { id: string; word: string }[]>>({});
  const [ngInput,    setNgInput]    = useState<Record<string, string>>({});

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    const data = await fetch("/api/accounts").then((r) => r.json());
    setAccounts(data);
  }

  async function loadPatterns(accountId: string) {
    if (patternMap[accountId]) return;
    const data = await fetch(`/api/accounts/${accountId}/stats`).then((r) => r.json());
    setPatternMap((prev) => ({ ...prev, [accountId]: data.patterns ?? [] }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (editing) {
      const res = await fetch(`/api/accounts/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, handle, bio, style, isActive: editing.isActive }),
      });
      const updated = await res.json();
      setAccounts((prev) => prev.map((a) => a.id === updated.id ? updated : a));
      setEditing(null);
    } else {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, handle, bio, style }),
      });
      const created = await res.json();
      setAccounts((prev) => [...prev, created]);
    }
    setName(""); setHandle(""); setBio(""); setStyle("");
    setLoading(false);
  }

  async function activate(a: Account) {
    await fetch(`/api/accounts/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    setAccounts((prev) => prev.map((acc) => ({ ...acc, isActive: acc.id === a.id })));
    setAccount({ id: a.id, name: a.name, handle: a.handle });
  }

  async function deleteAccount(id: string) {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    if (activeAccount?.id === id) {
      // 削除したアカウントがアクティブだった場合、残りの先頭に切替
      const next = accounts.find((a) => a.id !== id);
      if (next) setAccount({ id: next.id, name: next.name, handle: next.handle });
    }
  }

  function startEdit(a: Account) {
    setEditing(a);
    setName(a.name); setHandle(a.handle); setBio(a.bio ?? ""); setStyle(a.style ?? "");
  }

  function toggleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      loadPatterns(id);
      loadNgWords(id);
    }
  }

  async function loadNgWords(accountId: string) {
    if (ngWordMap[accountId]) return;
    const data = await fetch(`/api/accounts/${accountId}/ng-words`).then((r) => r.json());
    setNgWordMap((prev) => ({ ...prev, [accountId]: data }));
  }

  async function addNgWord(accountId: string) {
    const word = (ngInput[accountId] ?? "").trim();
    if (!word) return;
    const res  = await fetch(`/api/accounts/${accountId}/ng-words`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ word }),
    });
    if (res.ok) {
      const created = await res.json();
      setNgWordMap((prev) => ({ ...prev, [accountId]: [...(prev[accountId] ?? []), created] }));
      setNgInput((prev) => ({ ...prev, [accountId]: "" }));
    }
  }

  async function removeNgWord(accountId: string, wordId: string) {
    await fetch(`/api/accounts/${accountId}/ng-words`, {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ wordId }),
    });
    setNgWordMap((prev) => ({ ...prev, [accountId]: (prev[accountId] ?? []).filter((w) => w.id !== wordId) }));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">アカウント管理</h1>

      {/* 追加・編集フォーム */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <h2 className="font-semibold mb-4 text-sm">{editing ? "アカウントを編集" : "アカウントを追加"}</h2>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">名前 *</label>
              <input
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={name} onChange={(e) => setName(e.target.value)} required placeholder="例: ホラー編集長"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">ハンドル *</label>
              <input
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={handle} onChange={(e) => setHandle(e.target.value)} required placeholder="@なし: horror_editor"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">プロフィール</label>
            <input
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none"
              value={bio} onChange={(e) => setBio(e.target.value)} placeholder="アカウントの説明..."
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">文体スタイル</label>
            <textarea
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none h-20 resize-none"
              value={style} onChange={(e) => setStyle(e.target.value)} placeholder="投稿の文体・トーンの説明..."
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit" disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-md text-sm font-medium transition-colors"
            >
              {loading ? "保存中..." : editing ? "更新" : "追加"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => { setEditing(null); setName(""); setHandle(""); setBio(""); setStyle(""); }}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-md text-sm transition-colors"
              >
                キャンセル
              </button>
            )}
          </div>
        </form>
      </div>

      {/* アカウント一覧 */}
      <div className="space-y-3">
        {accounts.length === 0 && (
          <p className="text-zinc-500 text-sm">アカウントがありません。</p>
        )}
        {accounts.map((a) => {
          const isExpanded = expanded === a.id;
          const isActive   = activeAccount?.id === a.id;
          const patterns   = patternMap[a.id] ?? [];

          return (
            <div key={a.id} className={`bg-zinc-900 border rounded-lg overflow-hidden ${isActive ? "border-blue-500/50" : "border-zinc-800"}`}>
              {/* ヘッダー */}
              <div className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-700/40 flex items-center justify-center text-sm font-bold text-blue-300 flex-none">
                  {a.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{a.name}</span>
                    <span className="text-zinc-500 text-xs">@{a.handle}</span>
                    {isActive && (
                      <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-400 rounded-full">使用中</span>
                    )}
                  </div>
                  {a.bio && <p className="text-xs text-zinc-500 mt-0.5 truncate">{a.bio}</p>}
                </div>
                {/* 操作ボタン */}
                <div className="flex gap-1.5 flex-none">
                  {!isActive && (
                    <button
                      onClick={() => activate(a)}
                      className="text-xs px-2 py-1 bg-blue-900/50 text-blue-400 hover:bg-blue-800 rounded transition-colors"
                    >
                      切替
                    </button>
                  )}
                  <button
                    onClick={() => toggleExpand(a.id)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${isExpanded ? "bg-zinc-600 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"}`}
                  >
                    詳細
                  </button>
                  <button
                    onClick={() => startEdit(a)}
                    className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => deleteAccount(a.id)}
                    className="text-xs px-2 py-1 bg-zinc-800 hover:bg-red-900/60 text-zinc-600 hover:text-red-400 rounded transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>

              {/* 詳細展開 */}
              {isExpanded && (
                <div className="border-t border-zinc-800 p-4 space-y-4">

                  {/* 文体スタイル */}
                  {a.style && (
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">文体スタイル</div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{a.style}</p>
                    </div>
                  )}

                  {/* パターン重み */}
                  <div>
                    <div className="text-xs text-zinc-500 mb-2">学習済みパターン</div>
                    {patterns.length === 0 ? (
                      <p className="text-xs text-zinc-600">パターンなし（投稿後に学習を実行してください）</p>
                    ) : (
                      <div className="space-y-1.5">
                        {patterns.slice(0, 8).map((p) => (
                          <div key={p.pattern} className="flex items-center gap-3 text-xs">
                            <span className="text-zinc-400 flex-1 truncate">{p.pattern.split(/[：:]/)[0]}</span>
                            <div className="flex items-center gap-2 flex-none">
                              <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${Math.min((p.weight / 3.0) * 100, 100)}%` }}
                                />
                              </div>
                              <span className={`font-mono w-6 text-right ${
                                p.weight >= 2.0 ? "text-green-400" :
                                p.weight >= 1.5 ? "text-blue-400"  :
                                p.weight < 1.0  ? "text-red-400"   : "text-zinc-400"
                              }`}>
                                {p.weight.toFixed(1)}
                              </span>
                              <span className="text-zinc-600 w-16">
                                強{p.strongCount}/弱{p.weakCount}
                              </span>
                            </div>
                          </div>
                        ))}
                        {patterns.length > 8 && (
                          <p className="text-xs text-zinc-600">他 {patterns.length - 8} パターン...</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* NGワード管理 */}
                  <div>
                    <div className="text-xs text-zinc-500 mb-2">NGワード（生成チェック時に使用）</div>
                    <div className="flex gap-2 mb-2">
                      <input
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-red-500"
                        placeholder="NGワードを追加..."
                        value={ngInput[a.id] ?? ""}
                        onChange={(e) => setNgInput((prev) => ({ ...prev, [a.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && addNgWord(a.id)}
                      />
                      <button
                        onClick={() => addNgWord(a.id)}
                        className="text-xs px-2 py-1 bg-red-900/40 text-red-400 hover:bg-red-900 rounded transition-colors"
                      >
                        追加
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(ngWordMap[a.id] ?? []).map((w) => (
                        <span key={w.id} className="flex items-center gap-1 text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded">
                          {w.word}
                          <button onClick={() => removeNgWord(a.id, w.id)} className="text-red-600 hover:text-red-300 ml-0.5">×</button>
                        </span>
                      ))}
                      {(ngWordMap[a.id] ?? []).length === 0 && (
                        <span className="text-xs text-zinc-600">NGワードなし</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
