'use client'

import { useState } from 'react'
import { CopyButton } from '@/components/ui/CopyButton'
import { SaveButton } from '@/components/ui/SaveButton'
import type { ArticleOutput, StyleType } from '@/lib/generator'

const TABS = ['タイトル案','冒頭フック','見出し','本文','締め・誘導','告知文'] as const

export default function ArticlePage() {
  const [keyword, setKeyword] = useState('')
  const [style, setStyle] = useState<StyleType>('ぼそっと怖い')
  const [result, setResult] = useState<ArticleOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('タイトル案')

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, style }),
      })
      const json = await res.json()
      if (json.success) {
        setResult(json.data)
        setActiveTab('タイトル案')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="horror-title text-2xl font-bold text-red-500 mb-4">📰 X記事生成</h1>

      <div className="space-y-3 mb-4">
        <div>
          <label className="label-horror">テーマ・キーワード</label>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="例：心霊スポット、呪われた場所、怪現象…"
            className="input-horror"
          />
        </div>
        <div>
          <label className="label-horror">文体</label>
          <select value={style} onChange={e => setStyle(e.target.value as StyleType)} className="input-horror">
            {(['ぼそっと怖い','友達口調','怪談師','考察勢','都市伝説風'] as StyleType[]).map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <button onClick={generate} disabled={loading} className="w-full btn-red py-3">
          {loading ? '生成中…' : 'X記事を生成する（最大2000字）'}
        </button>
      </div>

      {result && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1 flex-wrap">
              {TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`text-xs px-3 py-1 rounded transition-colors ${
                    activeTab === t ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <SaveButton type="article" title={result.titles[0] || 'X記事'} input={{ keyword, style }} output={result} />
          </div>

          {activeTab === 'タイトル案' && (
            <div className="space-y-2">
              {result.titles.map((t, i) => (
                <div key={i} className="card flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-200 flex-1">{t}</p>
                  <CopyButton text={t} />
                </div>
              ))}
            </div>
          )}

          {activeTab === '冒頭フック' && (
            <div className="space-y-2">
              {result.hooks.map((h, i) => (
                <div key={i} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">案{i + 1}</span>
                    <CopyButton text={h} />
                  </div>
                  <p className="text-sm text-gray-200">{h}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === '見出し' && (
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">見出し一覧</span>
                <CopyButton text={result.headings.join('\n')} />
              </div>
              <div className="space-y-1">
                {result.headings.map((h, i) => (
                  <p key={i} className="text-sm text-red-300">{h}</p>
                ))}
              </div>
            </div>
          )}

          {activeTab === '本文' && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">{result.body.length}字</span>
                <CopyButton text={result.body} />
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed">
                {result.body}
              </pre>
            </div>
          )}

          {activeTab === '締め・誘導' && (
            <div className="space-y-3">
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">締め文</span>
                  <CopyButton text={result.closing} />
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans">{result.closing}</pre>
              </div>
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">コメント誘導</span>
                  <CopyButton text={result.commentPrompt} />
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans">{result.commentPrompt}</pre>
              </div>
            </div>
          )}

          {activeTab === '告知文' && (
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">通常ポスト用告知文</span>
                <CopyButton text={result.announcement} />
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans">{result.announcement}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
