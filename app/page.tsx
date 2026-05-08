import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const [postCount, accountCount, genreCount, buzzCount, recentPosts] = await Promise.all([
    prisma.post.count(),
    prisma.account.count(),
    prisma.genre.count(),
    prisma.buzzPost.count(),
    prisma.post.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        account: { select: { name: true } },
        genre: { select: { name: true } },
        metrics: { orderBy: { recordedAt: "desc" }, take: 1 },
      },
    }),
  ]);

  const cards = [
    { label: "総投稿数", value: postCount, href: "/history", color: "blue" },
    { label: "アカウント数", value: accountCount, href: "/accounts", color: "purple" },
    { label: "ジャンル数", value: genreCount, href: "/genres", color: "green" },
    { label: "バズ分析数", value: buzzCount, href: "/buzz", color: "orange" },
  ];

  const colorMap: Record<string, string> = {
    blue: "border-blue-500/30 text-blue-400",
    purple: "border-purple-500/30 text-purple-400",
    green: "border-green-500/30 text-green-400",
    orange: "border-orange-500/30 text-orange-400",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-zinc-500 text-sm mt-1">X投稿の生成・分析・最適化</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(({ label, value, href, color }) => (
          <Link
            key={label}
            href={href}
            className={`bg-zinc-900 border rounded-lg p-4 hover:bg-zinc-800 transition-colors ${colorMap[color]}`}
          >
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-zinc-400 text-sm mt-1">{label}</div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">クイックアクション</h2>
          </div>
          <div className="space-y-2">
            {[
              { href: "/generate", label: "投稿文を生成する", desc: "テーマを入力して3案を生成" },
              { href: "/image-prompts", label: "画像プロンプトを生成", desc: "4ツール対応" },
              { href: "/video-prompts", label: "動画プロンプトを生成", desc: "Runway/Pika/Kling/Sora" },
              { href: "/buzz", label: "バズ投稿を分析する", desc: "URLまたは手動入力" },
              { href: "/metrics", label: "数値を入力する", desc: "エンゲージメントを記録" },
            ].map(({ href, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between p-3 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-zinc-500">{desc}</div>
                </div>
                <span className="text-zinc-600">→</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <h2 className="font-semibold mb-4">最近の投稿</h2>
          {recentPosts.length === 0 ? (
            <p className="text-zinc-500 text-sm">投稿がありません。</p>
          ) : (
            <div className="space-y-3">
              {recentPosts.map((post) => {
                const metric = post.metrics[0];
                const er = metric?.engagementRate;
                return (
                  <div key={post.id} className="text-sm border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
                    <div className="text-zinc-300 line-clamp-2">{post.content}</div>
                    <div className="flex gap-3 mt-1 text-xs text-zinc-600">
                      <span>{post.account.name}</span>
                      {post.genre && <span>{post.genre.name}</span>}
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        post.status === "posted" ? "bg-green-900/50 text-green-400" : "bg-zinc-800 text-zinc-500"
                      }`}>{post.status}</span>
                      {er != null && <span className="text-blue-400">ER: {Number(er).toFixed(2)}%</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
