"use client";
import { useState } from "react";

type PromptOutput = { tool: string; prompt: string; params?: string };

const GENRES = ["horror", "business", "lifestyle", "knowledge"];
const MOODS = ["scary", "happy", "serious", "calm"];
const DURATIONS = [5, 10, 15, 30];
const MOTIONS = ["slow", "normal", "fast"];

export default function VideoPromptsPage() {
  const [subject, setSubject] = useState("");
  const [genre, setGenre] = useState("horror");
  const [mood, setMood] = useState("scary");
  const [duration, setDuration] = useState<5 | 10 | 15 | 30>(10);
  const [motion, setMotion] = useState<"slow" | "normal" | "fast">("normal");
  const [results, setResults] = useState<PromptOutput[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  async function generate() {
    if (!subject) return;
    setLoading(true);
    const res = await fetch("/api/generate/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, genre, mood, duration, motion }),
    });
    setResults(await res.json());
    setLoading(false);
  }

  async function copy(text: string, i: number) {
    await navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">動画プロンプト生成</h1>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">被写体 / テーマ *</label>
          <input
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="例: 深夜の廃墟を歩く人影、夕暮れの都市..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">ジャンル</label>
            <select
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm focus:outline-none"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            >
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">ムード</label>
            <select
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm focus:outline-none"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
            >
              {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">秒数</label>
            <select
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm focus:outline-none"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) as typeof duration)}
            >
              {DURATIONS.map((d) => <option key={d} value={d}>{d}秒</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">モーション</label>
            <select
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm focus:outline-none"
              value={motion}
              onChange={(e) => setMotion(e.target.value as typeof motion)}
            >
              {MOTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={!subject || loading}
          className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md py-2 text-sm font-medium transition-colors"
        >
          {loading ? "生成中..." : "4ツール分のプロンプトを生成"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-sm text-red-400">{r.tool}</span>
                {r.params && <span className="text-xs text-zinc-600">{r.params}</span>}
              </div>
              <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">{r.prompt}</pre>
              <button
                onClick={() => copy(r.prompt, i)}
                className="mt-3 text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
              >
                {copied === i ? "コピー済!" : "コピー"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
