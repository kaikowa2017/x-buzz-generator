'use client'

import { useState } from 'react'
import { CopyButton } from '@/components/ui/CopyButton'
import { SaveButton } from '@/components/ui/SaveButton'
import type { HookOutput } from '@/lib/generator'

export default function HooksPage() {
  const [keyword, setKeyword] = useState('')
  const [postType, setPostType] = useState('')
  const [results, setResults] = useState<HookOutput[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, postType }),
      })
      const json = await res.json()
      if (json.success) {
        setResults(json.data)
        setActiveTab(0)
      }
    } finally {
      setLoading(false)
    }
  }

  const allHooks = results.flatMap(r => r.hooks).join('\n')

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="horror-title text-2xl font-bold text-red-500 mb-4">🔗 フック生成</h1>

      <div className="space-y-3 mb-4">
        <div>
          <label className="label-horror">キーワード（任意）</label>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="例：心霊写真、廃墟…"
            className="input-horror"
          />
        </div>
        <div>
          <label className="label-horror">投稿タイプ</label>
          <select value={postType} onChange={e => setPostType(e.target.value)} className="input-horror">
            <option value="">すべて</option>
            {['短文ポスト','意味怖','考察誘導','画像付き投稿','動画付き投稿'].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <button onClick={generate} disabled={loading} className="w-full btn-red py-3">
          {loading ? '生成中…' : 'フックを20個生成する'}
        </button>
      </div>

      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500">{results.reduce((a, r) => a + r.hooks.length, 0)}個生成</p>
            <div className="flex gap-2">
              <CopyButton text={allHooks} label="全コピー" />
              <SaveButton type="hooks" title={`フック生成 ${keyword || '無題'}`} input={{ keyword, postType }} output={results} />
            </div>
          </div>

          <div className="flex gap-1 mb-3 flex-wrap">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`text-xs px-3 py-1 rounded transition-colors ${
                  activeTab === i ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222]'
                }`}
              >
                {r.category}
              </button>
            ))}
          </div>

          {results[activeTab] && (
            <div className="space-y-2">
              {results[activeTab].hooks.map((hook, i) => (
                <div key={i} className="card flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-200 flex-1">{hook}</p>
                  <CopyButton text={hook} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
