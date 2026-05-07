"use client";
import { useEffect, useState } from "react";
import { useAccount } from "@/contexts/AccountContext";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

type Metric = {
  id: string;
  likes: number;
  replies: number;
  impressions: number;
  engagementRate: number | null;
  recordedAt: string;
};

type Post = {
  id:            string;
  accountId:     string;
  content:       string;
  imagePrompt:   string | null;
  videoPrompt:   string | null;
  status:        string;
  postType:      string | null;
  usedPatterns:  string | null;
  isTemplate:    boolean;
  templateTitle: string | null;
  createdAt:     string;
  account:       { name: string; handle: string };
  genre:         { name: string } | null;
  metrics:       Metric[];
};

type Level = "強い" | "普通" | "弱い";

type AnalysisResult = {
  level: Level;
  likeRate: number;
  commentRate: number;
  causes: string[];
  improvement: string;
};

type LearnResult = {
  level: Level;
  updated: { pattern: string; weight: number; strongCount: number; weakCount: number }[];
  adjustments: { pattern: string; type: string; reason: string; oldWeight: number; newWeight: number }[];
};

/* ------------------------------------------------------------------ */
/* Analysis logic                                                       */
/* ------------------------------------------------------------------ */

function analyze(impressions: number, likes: number, comments: number): AnalysisResult | null {
  if (impressions === 0) return null;

  const likeRate    = (likes    / impressions) * 100;
  const commentRate = (comments / impressions) * 100;

  let level: Level;
  if      (likeRate >= 3 || commentRate >= 0.5) level = "強い";
  else if (likeRate >= 1 || commentRate >= 0.2) level = "普通";
  else                                           level = "弱い";

  const causes: string[] = [];

  if      (likeRate >= 3) causes.push(`いいね率 ${likeRate.toFixed(2)}% — フックが機能し広く刺さっている`);
  else if (likeRate >= 1) causes.push(`いいね率 ${likeRate.toFixed(2)}% — フックは届いているが伸びしろあり`);
  else                    causes.push(`いいね率 ${likeRate.toFixed(2)}% — フックが弱いか投稿タイミングの問題`);

  if      (commentRate >= 0.5)             causes.push(`コメント率 ${commentRate.toFixed(2)}% — 議論を生む内容で深く刺さっている`);
  else if (commentRate < 0.2 && comments === 0) causes.push("コメント 0 — 問いかけや賛否を促す要素がない");
  else if (commentRate < 0.2 && comments > 0)   causes.push(`コメント率 ${commentRate.toFixed(2)}% — 反応はあるが会話が広がっていない`);

  let improvement: string;
  if      (level === "強い")  improvement = "「学習に反映」済み。同じパターンで連投も有効。";
  else if (likeRate < 1)      improvement = "冒頭の1文を見直す。数字・疑問・衝撃ファクトでフックを強化する。";
  else if (commentRate < 0.2) improvement = "末尾に「あなたはどう思う？」など一言添えてコメントを誘発する。";
  else                        improvement = "投稿時間を分析して、インプレッションが最も伸びる時間帯を狙う。";

  return { level, likeRate, commentRate, causes, improvement };
}

/* ------------------------------------------------------------------ */
/* Style maps                                                           */
/* ------------------------------------------------------------------ */

const STATUS_LABELS: Record<string, string> = { draft: "下書き", posted: "投稿済", archived: "アーカイブ" };
const STATUS_COLORS: Record<string, string> = {
  posted:   "text-green-400 bg-green-900/30",
  archived: "text-zinc-500 bg-zinc-800",
  draft:    "text-yellow-400 bg-yellow-900/30",
};
const POST_TYPE_COLORS: Record<string, string> = {
  "バズ":   "bg-orange-900/40 text-orange-400",
  "考察":   "bg-blue-900/40 text-blue-400",
  "刺さる": "bg-purple-900/40 text-purple-400",
};
const LEVEL_STYLE: Record<Level, { text: string; border: string; bg: string }> = {
  "強い": { text: "text-green-400", border: "border-green-700/50", bg: "bg-green-900/20" },
  "普通": { text: "text-yellow-400", border: "border-yellow-700/50", bg: "bg-yellow-900/20" },
  "弱い": { text: "text-red-400",   border: "border-red-700/50",   bg: "bg-red-900/20"   },
};
const ADJ_COLORS: Record<string, string> = {
  "違和感": "bg-orange-900/40 text-orange-400",
  "曖昧さ": "bg-yellow-900/40 text-yellow-400",
  "分岐":   "bg-purple-900/40 text-purple-400",
};

function parsePatterns(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

/* ------------------------------------------------------------------ */
/* PostCard                                                             */
/* ------------------------------------------------------------------ */

function PostCard({
  post,
  onStatusChange,
  onDelete,
  onTemplateChange,
}: {
  post: Post;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onTemplateChange: (id: string, isTemplate: boolean) => void;
}) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showPrompts,  setShowPrompts]  = useState(false);

  const [impressions, setImpressions] = useState(0);
  const [likes,       setLikes]       = useState(0);
  const [comments,    setComments]    = useState(0);

  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [learnResult,  setLearnResult]  = useState<LearnResult | null>(null);
  const [templating,   setTemplating]   = useState(false);
  const [isTemplate,   setIsTemplate]   = useState(post.isTemplate);

  useEffect(() => {
    if (post.metrics.length > 0) {
      const m = post.metrics[0];
      setImpressions(m.impressions);
      setLikes(m.likes);
      setComments(m.replies);
    }
  }, [post.metrics]);

  const result      = (showAnalysis && impressions > 0) ? analyze(impressions, likes, comments) : null;
  const latestMetric = post.metrics[0] ?? null;
  const patterns    = parsePatterns(post.usedPatterns);

  async function saveAndLearn() {
    if (impressions === 0) return;
    setSaving(true);
    setLearnResult(null);

    // ① メトリクス保存
    await fetch(`/api/posts/${post.id}/metrics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ impressions, likes, retweets: 0, replies: comments, bookmarks: 0 }),
    });

    // ② 分析結果でパターン学習を自動実行
    const level = result?.level ?? analyze(impressions, likes, comments)?.level;
    if (level) {
      const res = await fetch("/api/learn/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, level, accountId: post.accountId }),
      });
      if (res.ok) {
        const data: LearnResult = await res.json();
        setLearnResult(data);
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function toggleTemplate() {
    setTemplating(true);
    const next = !isTemplate;
    await fetch(`/api/posts/${post.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTemplate: next }),
    });
    setIsTemplate(next);
    onTemplateChange(post.id, next);
    setTemplating(false);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">

      {/* ── メインコンテンツ ── */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* バッジ */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {post.postType && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${POST_TYPE_COLORS[post.postType] ?? "bg-zinc-800 text-zinc-400"}`}>
                  {post.postType}
                </span>
              )}
              {post.genre && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{post.genre.name}</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[post.status] ?? STATUS_COLORS.draft}`}>
                {STATUS_LABELS[post.status] ?? post.status}
              </span>
              {isTemplate && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400">★ テンプレート</span>
              )}
            </div>

            {/* 本文 */}
            <p className="text-sm leading-relaxed whitespace-pre-wrap line-clamp-3">{post.content}</p>

            {/* メタ */}
            <div className="flex flex-wrap items-center gap-x-3 mt-2 text-xs text-zinc-600">
              <span>{post.account.name}</span>
              <span>
                {new Date(post.createdAt).toLocaleDateString("ja-JP", {
                  month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </span>
              {latestMetric && latestMetric.impressions > 0 && (
                <span className="text-zinc-500">
                  インプ {latestMetric.impressions.toLocaleString()} /
                  いいね {latestMetric.likes} /
                  コメ {latestMetric.replies}
                </span>
              )}
            </div>

            {/* 使用パターン */}
            {patterns.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {patterns.map((p) => (
                  <span key={p} className="text-xs bg-zinc-800/80 text-zinc-500 px-1.5 py-0.5 rounded">
                    {p.split(/[：:]/)[0].trim()}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 操作 */}
          <div className="flex flex-col items-end gap-1.5 flex-none">
            <button
              onClick={() => { setShowAnalysis((v) => !v); setShowPrompts(false); }}
              className={`text-xs px-2 py-1 rounded transition-colors ${showAnalysis ? "bg-blue-700 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"}`}
            >
              分析
            </button>
            <button
              onClick={() => { setShowPrompts((v) => !v); setShowAnalysis(false); }}
              className={`text-xs px-2 py-1 rounded transition-colors ${showPrompts ? "bg-zinc-600 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"}`}
            >
              詳細
            </button>
            {post.status !== "posted" && (
              <button
                onClick={() => onStatusChange(post.id, "posted")}
                className="text-xs px-2 py-1 bg-green-900 hover:bg-green-800 text-green-400 rounded transition-colors"
              >
                投稿済
              </button>
            )}
            <button
              onClick={toggleTemplate}
              disabled={templating}
              title={isTemplate ? "テンプレート解除" : "テンプレートとして保存"}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                isTemplate
                  ? "bg-yellow-900/40 text-yellow-400 hover:bg-yellow-900/60"
                  : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-yellow-400"
              }`}
            >
              {templating ? "..." : isTemplate ? "★" : "☆"}
            </button>
            <button
              onClick={() => onDelete(post.id)}
              className="text-xs px-2 py-1 bg-zinc-800 hover:bg-red-900/60 text-zinc-600 hover:text-red-400 rounded transition-colors"
            >
              削除
            </button>
          </div>
        </div>
      </div>

      {/* ── 分析パネル ── */}
      {showAnalysis && (
        <div className="border-t border-zinc-800 p-4 space-y-4">

          {/* 数値入力 */}
          <div className="grid grid-cols-3 gap-3">
            {([
              { label: "インプレッション", value: impressions, setter: setImpressions },
              { label: "いいね",           value: likes,       setter: setLikes       },
              { label: "コメント",         value: comments,    setter: setComments    },
            ] as const).map(({ label, value, setter }) => (
              <div key={label}>
                <label className="block text-xs text-zinc-500 mb-1">{label}</label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                  value={value}
                  onChange={(e) => setter(Math.max(0, Number(e.target.value)))}
                />
              </div>
            ))}
          </div>

          {/* 分析結果 */}
          {result ? (
            <div className={`rounded-lg border p-4 space-y-3 ${LEVEL_STYLE[result.level].bg} ${LEVEL_STYLE[result.level].border}`}>
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold ${LEVEL_STYLE[result.level].text}`}>{result.level}</span>
                <div className="text-xs text-zinc-500 space-y-0.5">
                  <div>いいね率 <span className="text-zinc-300 font-mono">{result.likeRate.toFixed(2)}%</span></div>
                  <div>コメント率 <span className="text-zinc-300 font-mono">{result.commentRate.toFixed(2)}%</span></div>
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">原因</div>
                <ul className="space-y-1">
                  {result.causes.map((c, i) => (
                    <li key={i} className="text-sm text-zinc-300 flex gap-2">
                      <span className="text-zinc-600 flex-none">•</span>{c}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">次回改善ポイント</div>
                <p className="text-sm text-zinc-200">{result.improvement}</p>
              </div>
            </div>
          ) : impressions === 0 ? (
            <p className="text-xs text-zinc-600">インプレッションを入力すると分析が表示されます</p>
          ) : null}

          {/* 保存ボタン */}
          <div className="flex items-center gap-3">
            <button
              onClick={saveAndLearn}
              disabled={saving || impressions === 0}
              className="text-xs px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {saving ? "保存 & 学習中..." : "保存 & 学習"}
            </button>
            {saved && <span className="text-xs text-green-400">保存しました</span>}
          </div>

          {/* 学習結果 */}
          {learnResult && (
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <div className="text-xs text-zinc-500 font-medium">パターン学習結果</div>

              {/* 更新されたパターン */}
              {learnResult.updated.length > 0 && (
                <div className="space-y-1.5">
                  {learnResult.updated.map((p) => (
                    <div key={p.pattern} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 truncate max-w-xs">{p.pattern}</span>
                      <div className="flex items-center gap-3 flex-none ml-2">
                        <span className="text-zinc-600">強{p.strongCount} / 弱{p.weakCount}</span>
                        <span className={`font-mono font-semibold ${
                          p.weight >= 2.0 ? "text-green-400" :
                          p.weight >= 1.5 ? "text-blue-400" :
                          p.weight < 1.0  ? "text-red-400"  : "text-zinc-400"
                        }`}>
                          {p.weight.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 三つの調整 */}
              {learnResult.adjustments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-zinc-600">自動調整</div>
                  {learnResult.adjustments.map((adj, i) => (
                    <div key={i} className="bg-zinc-800 rounded-md p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ADJ_COLORS[adj.type] ?? "bg-zinc-700 text-zinc-400"}`}>
                          {adj.type}
                        </span>
                        <span className="text-xs text-zinc-300 truncate">{adj.pattern}</span>
                        <span className="text-xs text-zinc-600 flex-none ml-auto">
                          {adj.oldWeight.toFixed(1)} → {adj.newWeight.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">{adj.reason}</p>
                    </div>
                  ))}
                </div>
              )}

              {learnResult.updated.length === 0 && (
                <p className="text-xs text-zinc-600">マッチするパターンがありませんでした（フックパターンなし）</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── プロンプト詳細 ── */}
      {showPrompts && (
        <div className="border-t border-zinc-800">
          {post.imagePrompt && (
            <div className="px-4 py-3 border-b border-zinc-800/60">
              <div className="text-xs font-medium text-purple-400 mb-1">画像プロンプト</div>
              <p className="text-xs text-zinc-400 leading-relaxed">{post.imagePrompt}</p>
            </div>
          )}
          {post.videoPrompt && (
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-red-400 mb-1">動画プロンプト</div>
              <p className="text-xs text-zinc-400 leading-relaxed">{post.videoPrompt}</p>
            </div>
          )}
          {!post.imagePrompt && !post.videoPrompt && (
            <div className="px-4 py-3 text-xs text-zinc-600">プロンプトなし</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* History Page                                                         */
/* ------------------------------------------------------------------ */

export default function HistoryPage() {
  const { account } = useAccount();
  const [posts,          setPosts]          = useState<Post[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterPostType, setFilterPostType] = useState("");
  const [filterGenre,    setFilterGenre]    = useState("");
  const [filterTemplate, setFilterTemplate] = useState(false);
  const [search,         setSearch]         = useState("");
  const [allAccounts,    setAllAccounts]    = useState(false);

  useEffect(() => {
    const url = (!allAccounts && account?.id)
      ? `/api/posts?accountId=${account.id}`
      : "/api/posts";
    fetch(url)
      .then((r) => r.json())
      .then((data) => { setPosts(data); setLoading(false); });
  }, [account, allAccounts]);

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/posts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
  }

  async function deletePost(id: string) {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  function handleTemplateChange(id: string, isTemplate: boolean) {
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, isTemplate } : p));
  }

  function exportCSV(type: "posts" | "patterns") {
    const qs = account?.id ? `?accountId=${account.id}` : "";
    window.location.href = `/api/export/${type}${qs}`;
  }

  const genres = Array.from(new Set(posts.map((p) => p.genre?.name).filter((g): g is string => !!g)));

  const filtered = posts.filter((p) => {
    if (filterStatus   && p.status !== filterStatus)       return false;
    if (filterPostType && p.postType !== filterPostType)   return false;
    if (filterGenre    && p.genre?.name !== filterGenre)   return false;
    if (filterTemplate && !p.isTemplate)                   return false;
    if (search         && !p.content.includes(search))     return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">投稿履歴</h1>
          {account && !allAccounts && (
            <div className="text-xs text-zinc-500 mt-0.5">{account.name} のみ表示中</div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAllAccounts((v) => !v)}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              allAccounts ? "bg-zinc-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {allAccounts ? "全アカウント" : "このアカウント"}
          </button>
          <button
            onClick={() => setFilterTemplate((v) => !v)}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              filterTemplate ? "bg-yellow-700/60 text-yellow-300" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            ★ テンプレートのみ
          </button>
          <div className="flex-1" />
          <button
            onClick={() => exportCSV("posts")}
            className="text-xs px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
            title="投稿履歴をCSVでダウンロード"
          >
            ↓ 投稿CSV
          </button>
          <button
            onClick={() => exportCSV("patterns")}
            className="text-xs px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
            title="学習データをCSVでダウンロード"
          >
            ↓ 学習CSV
          </button>
          <span className="text-sm text-zinc-500">{filtered.length} 件</span>
        </div>
      </div>

      {/* フィルタ */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <input
          className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          placeholder="投稿文を検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1">
            {["", "draft", "posted", "archived"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  filterStatus === s ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {s === "" ? "全て" : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {["", "バズ", "考察", "刺さる"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterPostType(t)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  filterPostType === t
                    ? t ? `${POST_TYPE_COLORS[t]} ring-1 ring-current` : "bg-zinc-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {t || "全タイプ"}
              </button>
            ))}
          </div>
          {genres.length > 0 && (
            <select
              className="text-xs bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 focus:outline-none"
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
            >
              <option value="">全ジャンル</option>
              {genres.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* 一覧 */}
      {loading ? (
        <div className="text-zinc-500 text-sm">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-zinc-500 text-sm">
          {posts.length === 0
            ? "投稿がありません。生成して保存してください。"
            : "条件に一致する投稿がありません。"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} onStatusChange={updateStatus} onDelete={deletePost} onTemplateChange={handleTemplateChange} />
          ))}
        </div>
      )}
    </div>
  );
}
