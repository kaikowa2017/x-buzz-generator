import Link from 'next/link'

const FEATURES = [
  { href: '/post', icon: '✍️', label: '投稿生成', desc: 'X向けホラー投稿を生成' },
  { href: '/hooks', icon: '🔗', label: 'フック生成', desc: '冒頭フックを20個生成' },
  { href: '/ideas', icon: '💡', label: 'ネタ生成', desc: 'ホラーネタを多数生成' },
  { href: '/review', icon: '📝', label: '添削', desc: '投稿をAI風に分析・改善' },
  { href: '/article', icon: '📰', label: 'X記事生成', desc: '最大2000字のX記事' },
  { href: '/manga', icon: '📚', label: '漫画構成', desc: '1〜10コマ構成を生成' },
  { href: '/prompts', icon: '🎨', label: '画像・動画プロンプト', desc: 'Midjourney/Runway等向け' },
  { href: '/buzz', icon: '🔥', label: 'バズ投稿DB', desc: 'バズ投稿を保存・分析' },
  { href: '/accounts', icon: '👤', label: '参考アカウント', desc: 'Xアカウントを管理' },
  { href: '/presets', icon: '🎭', label: '文体プリセット', desc: '文体を保存・再利用' },
  { href: '/history', icon: '📜', label: '履歴', desc: '生成履歴を管理' },
]

export default function Home() {
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="text-center py-8">
        <h1 className="horror-title text-4xl font-bold text-red-500 mb-2">
          ホラーX<br />編集長AI
        </h1>
        <p className="text-gray-500 text-sm">X向けホラー投稿ツール — 完全ローカル</p>
        <div className="mt-3 flex justify-center gap-2">
          <span className="text-xs px-2 py-1 bg-red-900/30 text-red-400 rounded border border-red-800">
            API接続なし
          </span>
          <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded border border-gray-700">
            ローカル保存
          </span>
          <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded border border-gray-700">
            localhost:3001
          </span>
        </div>
      </div>

      <Link
        href="/post"
        className="block card border-red-800 bg-red-950/20 hover:bg-red-950/40 transition-colors mb-6 text-center"
      >
        <span className="text-2xl">✍️</span>
        <p className="text-red-400 font-bold mt-1">今すぐ投稿を生成する</p>
        <p className="text-gray-500 text-xs mt-1">キーワードを入れてワンクリック生成</p>
      </Link>

      <div className="grid grid-cols-2 gap-3">
        {FEATURES.map(f => (
          <Link
            key={f.href}
            href={f.href}
            className="card hover:border-red-800 transition-colors"
          >
            <span className="text-xl">{f.icon}</span>
            <p className="text-sm font-medium text-gray-200 mt-1">{f.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
