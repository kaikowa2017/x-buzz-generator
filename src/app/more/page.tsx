import Link from 'next/link'

const ITEMS = [
  { href: '/win',   icon: '⚡', label: '勝率UP',    desc: 'スコア・フックABC・違和感・FB分析' },
  { href: '/hooks', icon: '🔗', label: 'フック生成', desc: '冒頭フックを20個生成' },
  { href: '/ideas', icon: '💡', label: 'ネタ生成', desc: 'ホラーネタを多数生成' },
  { href: '/review', icon: '📝', label: '添削', desc: '投稿をルールベースで分析' },
  { href: '/article', icon: '📰', label: 'X記事生成', desc: '最大2000字のX記事' },
  { href: '/buzz', icon: '🔥', label: 'バズ投稿DB', desc: 'バズ投稿を保存・分析' },
  { href: '/accounts', icon: '👤', label: '参考アカウント管理', desc: 'Xアカウントを管理' },
  { href: '/presets', icon: '🎭', label: '文体プリセット', desc: '文体を保存・再利用' },
  { href: '/history', icon: '📜', label: '履歴', desc: '生成履歴を管理' },
]

export default function MorePage() {
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="horror-title text-2xl font-bold text-red-500 mb-4">☰ メニュー</h1>
      <div className="grid grid-cols-2 gap-3">
        {ITEMS.map(item => (
          <Link key={item.href} href={item.href} className="card hover:border-red-800 transition-colors">
            <span className="text-xl">{item.icon}</span>
            <p className="text-sm font-medium text-gray-200 mt-1">{item.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
