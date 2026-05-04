'use client'

import { useState } from 'react'
import { CopyButton } from '@/components/ui/CopyButton'
import { SaveButton } from '@/components/ui/SaveButton'
import type { IdeaOutput } from '@/lib/generator'

const TABS = [
  { key: 'horror', label: 'ホラー', emoji: '👁️' },
  { key: 'manga', label: '漫画', emoji: '📚' },
  { key: 'consideration', label: '考察', emoji: '🔍' },
  { key: 'meaningScary', label: '意味怖', emoji: '😱' },
  { key: 'twoImage', label: '2枚画像', emoji: '🖼️' },
  { key: 'xArticle', label: 'X記事', emoji: '📰' },
] as const

export default function IdeasPage() {
  const [keyword, setKeyword] = useState('')
  const [genre, setGenre] = useState('')
  const [results, setResults] = useState<IdeaOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<keyof IdeaOutput>('horror')

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, genre }),
      })
      const json = await res.json()
      if (json.success) setResults(json.data)
    } finally {
      setLoading(false)
    }
  }

  const currentIdeas = results ? results[activeTab] : []

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="horror-title text-2xl font-bold text-red-500 mb-4">💡 ネタ生成</h1>

      <div className="space-y-3 mb-4">
        <div>
          <label className="label-horror">キーワード（任意）</label>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="例：病院、山道、子供…"
            className="input-horror"
          />
        </div>
        <div>
          <label className="label-horror">ジャンル</label>
          <select value={genre} onChange={e => setGenre(e.target.value)} className="input-horror">
            <option value="">すべて</option>
            {['都市伝説','心霊','怪談','意味怖','スプラッタ','サイコホラー'].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <button onClick={generate} disabled={loading} className="w-full btn-red py-3">
          {loading ? '生成中…' : 'ネタを生成する'}
        </button>
      </div>

      {results && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1 flex-wrap">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    activeTab === t.key ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222]'
                  }`}
                >
                  {t.emoji} {t.label}({results[t.key].length})
                </button>
              ))}
            </div>
            <SaveButton type="ideas" title={`ネタ生成 ${keyword || '無題'}`} input={{ keyword, genre }} output={results} />
          </div>

          <div className="space-y-2">
            {currentIdeas.map((idea, i) => (
              <div key={i} className="card flex items-start justify-between gap-3">
                <p className="text-sm text-gray-200 flex-1">{idea}</p>
                <CopyButton text={idea} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
