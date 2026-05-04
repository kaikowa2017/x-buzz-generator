'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LockButton } from '@/components/auth/PasswordGate'

const NAV_ITEMS = [
  { href: '/', label: 'ホーム', icon: '🏠' },
  { href: '/post', label: '投稿', icon: '✍️' },
  { href: '/win',  label: '勝率UP', icon: '⚡' },
  { href: '/manga', label: '漫画', icon: '📚' },
  { href: '/more', label: 'その他', icon: '☰' },
]

const MORE_ITEMS = [
  { href: '/hooks',    label: 'フック生成' },
  { href: '/ideas',    label: 'ネタ生成' },
  { href: '/review',   label: '添削' },
  { href: '/article',  label: 'X記事' },
  { href: '/prompts',  label: '画像・動画プロンプト' },
  { href: '/buzz',     label: 'バズDB' },
  { href: '/accounts', label: '参考アカウント' },
  { href: '/presets',  label: '文体プリセット' },
  { href: '/history',  label: '履歴' },
]

export function BottomNav() {
  const path = usePathname()
  const isMore = MORE_ITEMS.some(i => i.href === path)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d0d] border-t border-horror-border md:hidden">
      <div className="flex">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
              path === item.href || (item.href === '/more' && isMore)
                ? 'text-red-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="mt-0.5">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

export function Sidebar() {
  const path = usePathname()
  const allItems = [
    { href: '/', label: 'ホーム', icon: '🏠' },
    { href: '/post', label: '投稿生成', icon: '✍️' },
    { href: '/win',  label: '勝率UP',   icon: '⚡' },
    { href: '/hooks', label: 'フック生成', icon: '🔗' },
    { href: '/ideas', label: 'ネタ生成', icon: '💡' },
    { href: '/review', label: '添削', icon: '📝' },
    { href: '/article', label: 'X記事生成', icon: '📰' },
    { href: '/manga', label: '漫画構成', icon: '📚' },
    { href: '/prompts', label: '画像・動画プロンプト', icon: '🎨' },
    { href: '/buzz', label: 'バズ投稿DB', icon: '🔥' },
    { href: '/accounts', label: '参考アカウント', icon: '👤' },
    { href: '/presets', label: '文体プリセット', icon: '🎭' },
    { href: '/history', label: '履歴', icon: '📜' },
  ]

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-[#0d0d0d] border-r border-horror-border fixed left-0 top-0">
      <div className="p-4 border-b border-horror-border">
        <h1 className="horror-title text-red-500 font-bold text-sm leading-tight">
          ホラーX<br />
          <span className="text-base">編集長AI</span>
        </h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {allItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
              path === item.href
                ? 'bg-red-900/30 text-red-400 border-r-2 border-red-500'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-horror-border">
        <LockButton className="w-full text-left px-1" />
      </div>
    </aside>
  )
}
