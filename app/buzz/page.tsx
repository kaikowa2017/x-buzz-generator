"use client";
import { useEffect, useState } from "react";
import { useAccount } from "@/contexts/AccountContext";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

type Pattern =
  | "疑問フック" | "数字リスト" | "実話・体験談" | "情報ギャップ"
  | "反論・逆張り" | "データ・統計" | "比較・対比"
  | "感情訴求" | "即時価値" | "ストーリー展開";

type DeepAnalysis = {
  genre: string;
  pattern: Pattern;
  hookStrength: "強い" | "普通" | "弱い";
  contemplation: "高" | "中" | "低";
  commentInduction: "高" | "中" | "低";
  whyViral: string;
  reproductionTemplate: [string, string, string, string];
  adaptedPost: string;
  sourceContent: string;
  sourceUrl?: string;
  accountId?: string;
  usage: { inputTokens: number; outputTokens: number; cacheRead: number };
};

type BuzzPost = {
  id: string;
  url: string | null;
  content: string;
  likes: number;
  retweets: number;
  replies: number;
  analysis: string | null;
  patterns: string | null;
  createdAt: string;
};

type Genre  = { id: string; name: string };
type Account = { id: string; name: string; handle: string };

/* ------------------------------------------------------------------ */
/* Style maps                                                           */
/* ------------------------------------------------------------------ */

const STRENGTH_STYLE = {
  "強い": "text-green-400 bg-green-900/30 border-green-700/50",
  "普通": "text-yellow-400 bg-yellow-900/30 border-yellow-700/50",
  "弱い": "text-red-400 bg-red-900/30 border-red-700/50",
};
const LEVEL_STYLE = {
  "高": "text-green-400",
  "中": "text-yellow-400",
  "低": "text-red-400",
};
const PATTERN_COLORS: Partial<Record<Pattern, string>> = {
  "疑問フック":    "bg-blue-900/40 text-blue-400",
  "数字リスト":    "bg-purple-900/40 text-purple-400",
  "実話・体験談":  "bg-orange-900/40 text-orange-400",
  "情報ギャップ":  "bg-cyan-900/40 text-cyan-400",
  "反論・逆張り":  "bg-red-900/40 text-red-400",
  "データ・統計":  "bg-indigo-900/40 text-indigo-400",
  "比較・対比":    "bg-pink-900/40 text-pink-400",
  "感情訴求":      "bg-rose-900/40 text-rose-400",
  "即時価値":      "bg-green-900/40 text-green-400",
  "ストーリー展開":"bg-amber-900/40 text-amber-400",
};

const STEP_LABELS = ["フック", "本題", "根拠", "締め"];

/* ------------------------------------------------------------------ */
/* AnalysisPanel                                                        */
/* ------------------------------------------------------------------ */

function AnalysisPanel({
  analysis,
  accountId,
  onSaved,
}: {
  analysis: DeepAnalysis;
  accountId: string;
  onSaved: (post: BuzzPost) => void;
}) {
  const [likes,     setLikes]     = useState(0);
  const [retweets,  setRetweets]  = useState(0);
  const [replies,   setReplies]   = useState(0);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [learnInfo, setLearnInfo] = useState<{ pattern: string; oldWeight: number; newWeight: number } | null>(null);
  const [copied,    setCopied]    = useState(false);

  async function saveAndLearn() {
    setSaving(true);

    // ① BuzzPost をDBに保存
    const buzzRes = await fetch("/api/buzz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url:      analysis.sourceUrl,
        content:  analysis.sourceContent,
        accountId: accountId || undefined,
        likes,
        retweets,
        replies,
        analysis: analysis.whyViral,
        patterns: [analysis.pattern],
        source:   analysis.sourceUrl ? "url" : "manual",
      }),
    });
    const saved = await buzzRes.json();

    // ② パターン重みを +0.1
    const learnRes = await fetch("/api/buzz/learn-pattern", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patternName: analysis.pattern, accountId: accountId || undefined }),
    });
    const learnData = await learnRes.json();

    setLearnInfo({ pattern: learnData.pattern, oldWeight: learnData.oldWeight, newWeight: learnData.newWeight });
    setSaving(false);
    setSaved(true);
    onSaved(saved);
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-4">

      {/* ヘッダーバッジ行 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-700 text-zinc-300 font-medium">
          ジャンル: {analysis.genre}
        </span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PATTERN_COLORS[analysis.pattern] ?? "bg-zinc-800 text-zinc-400"}`}>
          {analysis.pattern}
        </span>
      </div>

      {/* 3指標 */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { label: "フック強度", value: analysis.hookStrength, styleMap: STRENGTH_STYLE },
          { label: "考察性",     value: analysis.contemplation,  styleMap: null },
          { label: "コメント誘発度", value: analysis.commentInduction, styleMap: null },
        ] as const).map(({ label, value, styleMap }) => (
          <div key={label} className={`border rounded-lg px-3 py-2.5 text-center ${styleMap ? styleMap[value as keyof typeof styleMap] : "border-zinc-700 bg-zinc-800"}`}>
            <div className={`text-lg font-bold ${styleMap ? "" : LEVEL_STYLE[value as "高" | "中" | "低"]}`}>{value}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* なぜ伸びたか */}
      <div className="bg-zinc-800 rounded-lg p-4">
        <div className="text-xs font-medium text-zinc-400 mb-1.5">なぜ伸びたか</div>
        <p className="text-sm text-zinc-200 leading-relaxed">{analysis.whyViral}</p>
      </div>

      {/* 再現テンプレ */}
      <div className="bg-zinc-800 rounded-lg p-4">
        <div className="text-xs font-medium text-zinc-400 mb-3">再現テンプレ（4ステップ）</div>
        <div className="space-y-2">
          {analysis.reproductionTemplate.map((step, i) => (
            <div key={i} className="flex gap-3">
              <span className="flex-none text-xs font-bold text-orange-400 w-10 pt-0.5">
                {i + 1}. {STEP_LABELS[i]}
              </span>
              <p className="text-sm text-zinc-300 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 変換投稿案 */}
      <div className="bg-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-zinc-400">自分のジャンルに変換した投稿案</div>
          <button
            onClick={() => copy(analysis.adaptedPost)}
            className="text-xs px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
          >
            {copied ? "コピー済!" : "コピー"}
          </button>
        </div>
        <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{analysis.adaptedPost}</p>
        <div className="text-xs text-zinc-600 mt-1">{analysis.adaptedPost.length}文字</div>
      </div>

      {/* 数値 + 保存ボタン */}
      {!saved ? (
        <div className="space-y-3">
          <div className="text-xs text-zinc-500">元投稿の数値（任意）</div>
          <div className="grid grid-cols-3 gap-3">
            {([
              { label: "いいね",  value: likes,    setter: setLikes    },
              { label: "RT",      value: retweets, setter: setRetweets },
              { label: "コメント",value: replies,  setter: setReplies  },
            ] as const).map(({ label, value, setter }) => (
              <div key={label}>
                <label className="block text-xs text-zinc-600 mb-1">{label}</label>
                <input
                  type="number" min="0"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-orange-500"
                  value={value}
                  onChange={(e) => setter(Math.max(0, Number(e.target.value)))}
                />
              </div>
            ))}
          </div>
          <button
            onClick={saveAndLearn}
            disabled={saving}
            className="w-full bg-orange-700 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md py-2 text-sm font-medium transition-colors"
          >
            {saving ? "保存 & 学習中..." : "保存 & 学習に反映"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-green-400">保存しました</div>
          {learnInfo && (
            <div className="bg-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-400">
              パターン学習: <span className="text-zinc-300">{learnInfo.pattern.split(/[：:]/)[0]}</span>
              {" "}
              <span className="font-mono">{learnInfo.oldWeight.toFixed(1)} → {learnInfo.newWeight.toFixed(1)}</span>
            </div>
          )}
        </div>
      )}

      {/* キャッシュ情報 */}
      {analysis.usage.cacheRead > 0 && (
        <div className="text-xs text-zinc-600">
          プロンプトキャッシュヒット（{analysis.usage.cacheRead.toLocaleString()} tokens）
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BuzzPage                                                             */
/* ------------------------------------------------------------------ */

export default function BuzzPage() {
  const { account } = useAccount();
  const [tab,       setTab]       = useState<"url" | "text">("url");
  const [url,       setUrl]       = useState("");
  const [text,      setText]      = useState("");
  const [genreId,   setGenreId]   = useState("");
  const [accountId, setAccountId] = useState("");
  const [genres,    setGenres]    = useState<Genre[]>([]);
  const [accounts,  setAccounts]  = useState<Account[]>([]);
  const [posts,     setPosts]     = useState<BuzzPost[]>([]);
  const [analysis,  setAnalysis]  = useState<DeepAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (account?.id && !accountId) setAccountId(account.id);
  }, [account]);

  useEffect(() => {
    Promise.all([
      fetch("/api/genres").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/buzz").then((r) => r.json()),
    ]).then(([g, a, b]) => { setGenres(g); setAccounts(a); setPosts(b); });
  }, []);

  const selectedGenre = genres.find((g) => g.id === genreId);

  async function analyze() {
    setAnalyzing(true);
    setError(null);
    setAnalysis(null);

    const body = tab === "url"
      ? { url, genre: selectedGenre?.name, accountId: accountId || undefined }
      : { content: text, genre: selectedGenre?.name, accountId: accountId || undefined };

    const res = await fetch("/api/buzz/analyze-deep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "分析に失敗しました");
    } else {
      setAnalysis(await res.json());
    }
    setAnalyzing(false);
  }

  function onSaved(post: BuzzPost) {
    setPosts((prev) => [post, ...prev]);
  }

  const canAnalyze = tab === "url" ? !!url : !!text;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">バズ投稿分析</h1>

      {/* 入力フォーム */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">

        {/* タブ */}
        <div className="flex gap-2 p-1 bg-zinc-800 rounded-lg w-fit">
          {(["url", "text"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setAnalysis(null); setError(null); }}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${tab === t ? "bg-orange-600 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              {t === "url" ? "URLから取得" : "テキスト貼り付け"}
            </button>
          ))}
        </div>

        {/* 入力欄 */}
        {tab === "url" ? (
          <div>
            <label className="block text-sm text-zinc-400 mb-1">X投稿のURL *</label>
            <input
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
              placeholder="https://x.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm text-zinc-400 mb-1">バズった投稿のテキスト *</label>
            <textarea
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-orange-500 h-28 resize-none"
              placeholder="バズった投稿のテキストを貼り付け..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        )}

        {/* ジャンル・アカウント */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">自分のジャンル</label>
            <select
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm focus:outline-none"
              value={genreId}
              onChange={(e) => setGenreId(e.target.value)}
            >
              <option value="">選択...</option>
              {genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">アカウント</label>
            <select
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm focus:outline-none"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">選択...</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={analyze}
          disabled={!canAnalyze || analyzing}
          className="w-full bg-orange-700 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md py-2 text-sm font-medium transition-colors"
        >
          {analyzing ? "Claude が分析中..." : "構造分析する"}
        </button>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-md px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* 分析結果 */}
      {analysis && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <div className="text-sm font-semibold mb-4 text-orange-400">分析結果</div>
          <AnalysisPanel analysis={analysis} accountId={accountId} onSaved={onSaved} />
        </div>
      )}

      {/* DB一覧 */}
      {posts.length > 0 && (
        <div>
          <div className="text-sm font-semibold mb-3 text-zinc-400">分析済みバズ投稿 ({posts.length}件)</div>
          <div className="space-y-3">
            {posts.map((post) => {
              const patterns: string[] = post.patterns
                ? (() => { try { return JSON.parse(post.patterns!); } catch { return []; } })()
                : [];
              return (
                <div key={post.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <p className="text-sm text-zinc-300 line-clamp-2">{post.content}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {patterns.map((p) => (
                      <span key={p} className={`text-xs px-2 py-0.5 rounded-full ${PATTERN_COLORS[p as Pattern] ?? "bg-zinc-800 text-zinc-500"}`}>
                        {p}
                      </span>
                    ))}
                    {post.likes > 0 && <span className="text-xs text-zinc-600">いいね {post.likes}</span>}
                    <span className="text-xs text-zinc-600 ml-auto">
                      {new Date(post.createdAt).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                  {post.analysis && (
                    <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2">{post.analysis}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
