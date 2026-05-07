"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Post = {
  id: string;
  content: string;
  accountId: string;
  account: { name: string };
  genre: { name: string } | null;
  metrics: { likes: number; replies: number; engagementRate: number | null }[];
};

type Judgment = { strong: boolean; cause: string };

type FeedbackAdjustment = {
  pattern: string;
  type: "違和感" | "曖昧さ" | "分岐";
  reason: string;
  oldWeight: number;
  newWeight: number;
};

type FeedbackResult = {
  updated: { pattern: string; weight: number; strongCount: number; weakCount: number }[];
  adjustments: FeedbackAdjustment[];
};

function judge(likes: number, comments: number): Judgment | null {
  if (likes === 0 && comments === 0) return null;

  const score = likes + comments * 5;
  const strong = score >= 100;

  let cause: string;
  if (strong) {
    const ratio = comments > 0 ? likes / comments : likes;
    if (ratio > 20) cause = "フックで拡散したが、もう一歩の問いかけで会話も生める";
    else if (comments > likes * 0.1) cause = "議論を呼ぶ内容で深く刺さった";
    else cause = "フックと内容のバランスが取れている";
  } else {
    if (likes > 30) cause = "フックは届いているが、本文で読者が離脱している";
    else if (comments > 5) cause = "刺さる人には刺さっているが、フックの引きが弱い";
    else cause = "フックから見直す。冒頭1行で興味を引けていない";
  }

  return { strong, cause };
}

function AdjustmentBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    "違和感": "bg-orange-900/40 text-orange-400",
    "曖昧さ": "bg-yellow-900/40 text-yellow-400",
    "分岐": "bg-purple-900/40 text-purple-400",
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${colors[type] ?? "bg-zinc-800 text-zinc-400"}`}>
      {type}
    </span>
  );
}

function MetricsForm() {
  const searchParams = useSearchParams();
  const initialPostId = searchParams.get("postId") ?? "";

  const [posts, setPosts] = useState<Post[]>([]);
  const [postId, setPostId] = useState(initialPostId);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [learning, setLearning] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);

  useEffect(() => {
    fetch("/api/posts?status=posted")
      .then((r) => r.json())
      .then(setPosts);
  }, []);

  const selectedPost = posts.find((p) => p.id === postId);
  const judgment = judge(likes, comments);

  async function save() {
    if (!postId) { alert("投稿を選択してください"); return; }
    setSaving(true);
    await fetch(`/api/posts/${postId}/metrics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ likes, retweets: 0, replies: comments, impressions: 0, bookmarks: 0 }),
    });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  }

  async function sendFeedback() {
    if (!postId || !judgment) return;
    setLearning(true);
    setFeedback(null);
    const res = await fetch("/api/learn/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        strong: judgment.strong,
        accountId: selectedPost?.accountId,
      }),
    });
    const data: FeedbackResult = await res.json();
    setFeedback(data);
    setLearning(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">数値入力</h1>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-5">
        {/* 投稿選択 */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1">投稿を選択</label>
          <select
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none"
            value={postId}
            onChange={(e) => {
              setPostId(e.target.value);
              setLikes(0);
              setComments(0);
              setSaved(false);
              setFeedback(null);
            }}
          >
            <option value="">選択...</option>
            {posts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.account.name} — {p.content.slice(0, 40)}...
              </option>
            ))}
          </select>
        </div>

        {selectedPost && (
          <div className="bg-zinc-800 rounded-md p-3 text-sm text-zinc-400 line-clamp-2">
            {selectedPost.content}
          </div>
        )}

        {/* 数値入力 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">いいね</label>
            <input
              type="number"
              min="0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              value={likes}
              onChange={(e) => setLikes(Math.max(0, Number(e.target.value)))}
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">コメント</label>
            <input
              type="number"
              min="0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              value={comments}
              onChange={(e) => setComments(Math.max(0, Number(e.target.value)))}
            />
          </div>
        </div>

        {/* 判定パネル */}
        {judgment && (
          <div className={`rounded-lg p-4 border ${
            judgment.strong
              ? "bg-green-900/20 border-green-700/50"
              : "bg-red-900/20 border-red-700/50"
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-2xl font-bold ${
                judgment.strong ? "text-green-400" : "text-red-400"
              }`}>
                {judgment.strong ? "強い" : "弱い"}
              </span>
              <span className="text-xs text-zinc-500">
                スコア {likes + comments * 5} / 100
              </span>
            </div>
            <p className="text-sm text-zinc-300">{judgment.cause}</p>
          </div>
        )}

        {/* ボタン */}
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={!postId || saving || (likes === 0 && comments === 0)}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md py-2 text-sm font-medium transition-colors"
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <button
            onClick={sendFeedback}
            disabled={!postId || !judgment || learning}
            className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md py-2 text-sm font-medium transition-colors"
          >
            {learning ? "学習中..." : "学習に反映"}
          </button>
        </div>

        {saved && (
          <div className="text-center text-sm text-green-400">保存しました</div>
        )}
      </div>

      {/* 学習フィードバック結果 */}
      {feedback && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold">パターン学習結果</h2>

          {/* 更新されたパターン */}
          {feedback.updated.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 mb-2">重み更新</div>
              <div className="space-y-1.5">
                {feedback.updated.map((p) => (
                  <div key={p.pattern} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 truncate max-w-xs">{p.pattern}</span>
                    <div className="flex items-center gap-3 flex-none ml-2">
                      <span className="text-zinc-600">
                        強{p.strongCount} / 弱{p.weakCount}
                      </span>
                      <span className={`font-mono font-medium ${
                        p.weight >= 2.0 ? "text-green-400" :
                        p.weight >= 1.5 ? "text-blue-400" :
                        p.weight < 1.0 ? "text-red-400" : "text-zinc-400"
                      }`}>
                        {p.weight.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 三つの調整 */}
          {feedback.adjustments.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 mb-2">自動調整</div>
              <div className="space-y-2">
                {feedback.adjustments.map((adj, i) => (
                  <div key={i} className="bg-zinc-800 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AdjustmentBadge type={adj.type} />
                      <span className="text-xs text-zinc-300 truncate">{adj.pattern}</span>
                      <span className="text-xs text-zinc-600 flex-none ml-auto">
                        {adj.oldWeight.toFixed(1)} → {adj.newWeight.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">{adj.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {feedback.adjustments.length === 0 && (
            <p className="text-xs text-zinc-600">自動調整なし（データが十分に蓄積されると発動します）</p>
          )}
        </div>
      )}

      {/* 過去データ */}
      {selectedPost && selectedPost.metrics.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <h2 className="text-sm font-semibold mb-3 text-zinc-400">過去の記録</h2>
          <div className="space-y-2">
            {selectedPost.metrics.map((m, i) => {
              const past = judge(m.likes, m.replies);
              return (
                <div key={i} className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>いいね {m.likes}</span>
                  <span>コメント {m.replies}</span>
                  {past && (
                    <span className={past.strong ? "text-green-400" : "text-red-400"}>
                      {past.strong ? "強い" : "弱い"}
                    </span>
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

export default function MetricsPage() {
  return (
    <Suspense fallback={<div className="text-zinc-500">読み込み中...</div>}>
      <MetricsForm />
    </Suspense>
  );
}
