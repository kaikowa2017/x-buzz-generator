'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CopyButton } from '@/components/ui/CopyButton'

// Must match the key read in /post/page.tsx
const RESTORE_KEY = 'horror-post-restore'

interface HistoryItem {
  id: string
  type: string
  title: string
  input: string
  output: string
  createdAt: string
}

const TYPE_LABELS: Record<string, string> = {
  post: '投稿生成',
  hooks: 'フック生成',
  ideas: 'ネタ生成',
  review: '添削',
  article: 'X記事',
  manga: '漫画構成',
  prompts: 'プロンプト',
}

const TYPE_COLORS: Record<string, string> = {
  post: 'text-red-400',
  hooks: 'text-orange-400',
  ideas: 'text-yellow-400',
  review: 'text-blue-400',
  article: 'text-purple-400',
  manga: 'text-green-400',
  prompts: 'text-cyan-400',
}

export default function HistoryPage() {
  const router = useRouter()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<HistoryItem | null>(null)
  const [filterType, setFilterType] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/history')
      const json = await res.json()
      if (json.success) setItems(json.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const deleteItem = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/history/${id}`, { method: 'DELETE' })
    if (selected?.id === id) setSelected(null)
    load()
  }

  // Write input JSON to localStorage then navigate to /post.
  // /post reads and clears it on mount.
  const restoreToForm = (item: HistoryItem) => {
    try {
      // Validate it parses before writing
      const parsed = JSON.parse(item.input)
      if (typeof parsed !== 'object' || parsed === null) throw new Error()
      localStorage.setItem(RESTORE_KEY, JSON.stringify(parsed))
      router.push('/post')
    } catch {
      alert('入力データを読み取れませんでした。この履歴は復元できません。')
    }
  }

  const getOutputText = (item: HistoryItem): string => {
    try {
      const o = JSON.parse(item.output)
      if (typeof o === 'string') return o
      if (o.post?.text) return o.post.text   // AllGenerationOutput
      if (o.text) return o.text
      if (o.body) return o.body
      if (o.postText) return o.postText
      return JSON.stringify(o, null, 2)
    } catch {
      return item.output
    }
  }

  const filtered = filterType ? items.filter(i => i.type === filterType) : items
  const types = [...new Set(items.map(i => i.type))]

  const formatDate = (d: string) => {
    const dt = new Date(d)
    return `${dt.getMonth() + 1}/${dt.getDate()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="horror-title text-2xl font-bold text-red-500">📜 履歴</h1>
        <span className="text-xs text-gray-500">{filtered.length}件</span>
      </div>

      {/* type filter */}
      <div className="flex gap-1 flex-wrap mb-4">
        <button
          onClick={() => setFilterType('')}
          className={`text-xs px-3 py-1 rounded transition-colors ${
            filterType === '' ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400'
          }`}
        >
          すべて
        </button>
        {types.map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              filterType === t ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400'
            }`}
          >
            {TYPE_LABELS[t] || t}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-500 text-sm">読み込み中…</p>}

      <div className="space-y-2">
        {filtered.map(item => (
          <div
            key={item.id}
            className={`card cursor-pointer transition-colors ${
              selected?.id === item.id ? 'border-red-700' : 'hover:border-gray-600'
            }`}
          >
            {/* header row */}
            <div
              className="flex items-start justify-between gap-2"
              onClick={() => setSelected(selected?.id === item.id ? null : item)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${TYPE_COLORS[item.type] || 'text-gray-400'}`}>
                    {TYPE_LABELS[item.type] || item.type}
                  </span>
                  <span className="text-xs text-gray-600">{formatDate(item.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-300 truncate">{item.title}</p>
              </div>

              {/* action buttons */}
              <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                {/* restore button — only for post type */}
                {item.type === 'post' && (
                  <button
                    onClick={() => restoreToForm(item)}
                    className="text-xs px-2 py-1 border border-horror-border text-blue-400 hover:border-blue-500 hover:bg-blue-950/30 rounded transition-colors"
                    title="この設定を投稿生成フォームに復元して /post へ移動"
                  >
                    ↩ 復元
                  </button>
                )}
                <CopyButton text={getOutputText(item)} />
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-xs px-2 py-1 border border-horror-border text-gray-500 hover:border-red-700 hover:text-red-400 rounded transition-colors"
                >
                  削除
                </button>
              </div>
            </div>

            {/* expanded detail */}
            {selected?.id === item.id && (
              <div className="mt-3 pt-3 border-t border-horror-border space-y-3">
                {/* restore hint inside expanded view too */}
                {item.type === 'post' && (
                  <button
                    onClick={() => restoreToForm(item)}
                    className="w-full text-xs py-2 border border-blue-800 text-blue-400 hover:bg-blue-950/30 rounded transition-colors"
                  >
                    ↩ このキーワード・設定を投稿生成フォームに復元する
                  </button>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">出力内容</p>
                  <CopyButton text={getOutputText(item)} />
                </div>
                <pre className="whitespace-pre-wrap text-xs text-gray-300 font-sans leading-relaxed max-h-60 overflow-y-auto">
                  {getOutputText(item)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <p className="text-center text-gray-600 py-8">
          {filterType
            ? 'このタイプの履歴はありません。'
            : '生成した内容を「履歴に保存」ボタンで保存できます。'}
        </p>
      )}
    </div>
  )
}
