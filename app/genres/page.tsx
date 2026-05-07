"use client";
import { useEffect, useState } from "react";

type Genre = { id: string; name: string; description: string | null; rules: string | null; examples: string | null; createdAt: string };

export default function GenresPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [examples, setExamples] = useState("");
  const [editing, setEditing] = useState<Genre | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/genres").then((r) => r.json()).then(setGenres);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const body = {
      name,
      description,
      rules: rules ? rules.split("\n").filter(Boolean) : undefined,
      examples: examples ? examples.split("\n").filter(Boolean) : undefined,
    };
    if (editing) {
      const res = await fetch(`/api/genres/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const updated = await res.json();
      setGenres((prev) => prev.map((g) => g.id === updated.id ? updated : g));
      setEditing(null);
    } else {
      const res = await fetch("/api/genres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const created = await res.json();
      setGenres((prev) => [...prev, created]);
    }
    setName(""); setDescription(""); setRules(""); setExamples("");
    setLoading(false);
  }

  async function deleteGenre(id: string) {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/genres/${id}`, { method: "DELETE" });
    setGenres((prev) => prev.filter((g) => g.id !== id));
  }

  function startEdit(g: Genre) {
    setEditing(g);
    setName(g.name);
    setDescription(g.description ?? "");
    setRules(g.rules ? JSON.parse(g.rules).join("\n") : "");
    setExamples(g.examples ? JSON.parse(g.examples).join("\n") : "");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ジャンル管理</h1>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <h2 className="font-semibold mb-4 text-sm">{editing ? "ジャンルを編集" : "ジャンルを追加"}</h2>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">ジャンル名 *</label>
              <input
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={name} onChange={(e) => setName(e.target.value)} required placeholder="例: horror, business..."
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">説明</label>
              <input
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none"
                value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ジャンルの説明..."
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">ルール (1行1つ)</label>
            <textarea
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none h-20 resize-none"
              value={rules} onChange={(e) => setRules(e.target.value)}
              placeholder={"恐怖要素を必ず入れる\n実話風の書き方をする"}
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">例文 (1行1つ)</label>
            <textarea
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none h-20 resize-none"
              value={examples} onChange={(e) => setExamples(e.target.value)}
              placeholder={"昨夜不思議な体験をした...\nこれは実際に起きた話です..."}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-md text-sm font-medium transition-colors"
            >
              {loading ? "保存中..." : editing ? "更新" : "追加"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => { setEditing(null); setName(""); setDescription(""); setRules(""); setExamples(""); }}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-md text-sm transition-colors"
              >
                キャンセル
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-3">
        {genres.map((g) => {
          const rulesArr = g.rules ? JSON.parse(g.rules) as string[] : [];
          const examplesArr = g.examples ? JSON.parse(g.examples) as string[] : [];
          return (
            <div key={g.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">{g.name}</div>
                  {g.description && <p className="text-sm text-zinc-500 mt-0.5">{g.description}</p>}
                  {rulesArr.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-zinc-600 mb-1">ルール</div>
                      <div className="flex flex-wrap gap-1">
                        {rulesArr.map((r: string) => (
                          <span key={r} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{r}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {examplesArr.length > 0 && (
                    <div className="mt-2 text-xs text-zinc-600">
                      例: {examplesArr[0]?.slice(0, 60)}...
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => startEdit(g)}
                    className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => deleteGenre(g.id)}
                    className="text-xs px-2 py-1 bg-zinc-800 hover:bg-red-900 text-zinc-500 rounded transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {genres.length === 0 && <p className="text-zinc-500 text-sm">ジャンルがありません。</p>}
      </div>
    </div>
  );
}
