"use client";
import { useState, useEffect } from "react";
import { IMAGE_PRESETS, STAGE_NAMES, type ImagePreset, type AspectRatio } from "@/lib/image-generator";

type PromptOutput = {
  tool: string;
  prompt: string;
  negativePrompt?: string;
  params?: string;
  panels?: string[];
};

const GENRES = ["horror", "business", "lifestyle", "knowledge"];
const MOODS  = ["scary", "happy", "serious", "calm"];

const AR_OPTIONS: { value: AspectRatio; label: string; sub: string; icon: string }[] = [
  { value: "1:1",  label: "1:1",  sub: "正方形",         icon: "⬛" },
  { value: "4:5",  label: "4:5",  sub: "縦長・投稿向け", icon: "🟫" },
  { value: "9:16", label: "9:16", sub: "ストーリー向け", icon: "📱" },
  { value: "16:9", label: "16:9", sub: "横長",           icon: "🖥" },
];

const PANEL_COLORS = [
  "text-zinc-400",
  "text-blue-400",
  "text-yellow-400",
  "text-orange-400",
  "text-red-400",
  "text-purple-400",
];

export default function ImagePromptsPage() {
  const [presetId,    setPresetId]    = useState<string>("single");
  const [subject,     setSubject]     = useState("");
  const [genre,       setGenre]       = useState("horror");
  const [mood,        setMood]        = useState("scary");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [results,     setResults]     = useState<PromptOutput[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [copied,      setCopied]      = useState<string | null>(null);

  const preset      = IMAGE_PRESETS.find((p) => p.id === presetId) ?? IMAGE_PRESETS[0];
  const isMulti     = preset.panelCount > 1;
  const isLocked    = preset.overridesGenre;
  const arLocked    = preset.locksAr; // 4コマは2:3固定でUIを非活性

  const stageNames  = preset.stageLabels ?? STAGE_NAMES[preset.panelCount];

  // プリセット変更時にデフォルトARをセット
  useEffect(() => {
    if (!arLocked) setAspectRatio(preset.defaultAr);
  }, [presetId]);

  async function generate() {
    if (!subject) return;
    setLoading(true);
    const res = await fetch("/api/generate/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, genre, mood, aspectRatio, presetId }),
    });
    setResults(await res.json());
    setLoading(false);
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">画像プロンプト生成</h1>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-5">

        {/* ── 画像タイプ選択 ── */}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">画像タイプ</label>
          <div className="grid grid-cols-4 gap-2">
            {IMAGE_PRESETS.map((p) => {
              const active = presetId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPresetId(p.id)}
                  className={`py-2.5 px-3 rounded-lg border text-left transition-colors ${
                    active
                      ? "bg-purple-700 border-purple-500 text-white"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{p.icon}</span>
                    <span className="text-sm font-medium">{p.label}</span>
                  </div>
                  <div className={`text-xs mt-0.5 leading-tight ${active ? "text-purple-200" : "text-zinc-500"}`}>
                    {p.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 選択中タイプの説明 ── */}
        <div className={`rounded-lg border px-4 py-3 ${isLocked ? "bg-zinc-800 border-zinc-600" : "bg-zinc-800/50 border-zinc-700"}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xl">{preset.icon}</span>
            <span className="text-sm font-semibold text-zinc-200">{preset.label}</span>
            <span className="text-xs text-zinc-500 ml-auto">AR {arLocked ? "2:3" : aspectRatio} / {preset.panelCount}枚</span>
          </div>
          {isMulti ? (
            <div className="space-y-1">
              {stageNames.map((name, i) => (
                <div key={i} className={`text-xs flex gap-2 ${PANEL_COLORS[i + 1]}`}>
                  <span className="font-bold w-4 flex-none">{i + 1}.</span>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-zinc-400 space-y-0.5">
              {preset.modifier && <div>特徴: {preset.modifier.split(",").slice(0, 2).join(", ")}</div>}
              <div className="text-zinc-500">{preset.postNote}</div>
            </div>
          )}
          {isLocked && (
            <div className="text-xs text-amber-500 mt-1.5">※ スタイル・ムードはこのタイプに固定されます</div>
          )}
        </div>

        {/* ── 被写体 ── */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            {isMulti ? "ストーリーのテーマ / 状況 *" : "被写体 / テーマ *"}
          </label>
          <input
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
            placeholder={
              preset.id === "comparison"    ? "例: 片付ける前と後の部屋、運動前と後の体型変化..."   :
              preset.id === "oddity"        ? "例: 普通のダイニングルーム、にぎやかな公園..."        :
              preset.id === "contemplation" ? "例: 鏡に映る自分、夜空に浮かぶ月..."                  :
              isMulti                       ? "例: 廃病院で幽霊に遭遇する主人公..."                   :
              "例: 廃病院の廊下、未来都市の夕暮れ..."
            }
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* ── アスペクト比（画像タイプと独立・4コマのみ非活性） ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-zinc-400">アスペクト比</label>
            {arLocked && (
              <span className="text-xs text-amber-500">4コマは 2:3 固定</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {AR_OPTIONS.map(({ value, label, sub, icon }) => {
              const active    = !arLocked && aspectRatio === value;
              const isDefault = preset.defaultAr === value && !arLocked;
              return (
                <button
                  key={value}
                  onClick={() => !arLocked && setAspectRatio(value)}
                  disabled={arLocked}
                  className={`py-2.5 px-2 rounded-lg border text-center transition-colors ${
                    arLocked
                      ? "bg-zinc-900 border-zinc-800 text-zinc-700 cursor-not-allowed"
                      : active
                      ? "bg-blue-700 border-blue-500 text-white"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  <div className="text-base">{icon}</div>
                  <div className={`text-sm font-semibold mt-0.5 ${active ? "text-white" : ""}`}>{label}</div>
                  <div className={`text-xs leading-tight ${active ? "text-blue-200" : "text-zinc-500"}`}>{sub}</div>
                  {isDefault && !active && (
                    <div className="text-xs text-zinc-600 mt-0.5">default</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── ジャンル・ムード（スタイル固定タイプでは非表示） ── */}
        {!isLocked && (
          <div className="grid grid-cols-2 gap-3">
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
          </div>
        )}

        <button
          onClick={generate}
          disabled={!subject || loading}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md py-2 text-sm font-medium transition-colors"
        >
          {loading ? "生成中..." : `「${preset.label}」プロンプトを生成（4ツール）`}
        </button>
      </div>

      {/* ── 生成結果 ── */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>{preset.icon}</span>
            <span>{preset.label}</span>
            <span className="text-zinc-700">·</span>
            <span className="font-mono text-blue-400">aspect ratio {arLocked ? "2:3" : aspectRatio}</span>
            <span className="text-zinc-700">·</span>
            <span>{preset.postNote}</span>
          </div>
          {results.map((r, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-sm text-purple-400">{r.tool}</span>
                {r.params && <span className="text-xs text-zinc-600">{r.params}</span>}
              </div>

              {r.panels && r.panels.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {r.panels.map((panel, pi) => (
                    <div key={pi} className={`text-xs leading-relaxed ${PANEL_COLORS[pi + 1]}`}>
                      {panel}
                    </div>
                  ))}
                  <details className="text-xs text-zinc-600 mt-2">
                    <summary className="cursor-pointer hover:text-zinc-400">全プロンプトを表示</summary>
                    <pre className="mt-2 text-zinc-400 whitespace-pre-wrap break-words leading-relaxed">
                      {r.prompt}
                    </pre>
                  </details>
                </div>
              ) : (
                <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
                  {r.prompt}
                </pre>
              )}

              {r.negativePrompt && (
                <div className="mt-2 text-xs text-zinc-500">
                  <span className="text-zinc-600">Negative: </span>{r.negativePrompt}
                </div>
              )}

              <button
                onClick={() => copy(r.prompt, `${i}`)}
                className="mt-3 text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
              >
                {copied === `${i}` ? "コピー済!" : "全文コピー"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
