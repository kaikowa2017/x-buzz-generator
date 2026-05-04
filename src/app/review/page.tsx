'use client'

import { useState } from 'react'
import { CopyButton } from '@/components/ui/CopyButton'
import { SaveButton } from '@/components/ui/SaveButton'
import { ScoreCard } from '@/components/ui/ScoreCard'
import { OddityIdeas } from '@/components/ui/OddityIdeas'
import type { ReviewOutput, ScoreOutput, OddityIdea } from '@/lib/generator'

interface ReviewData {
  review: ReviewOutput
  score: ScoreOutput
  oddities: OddityIdea[]
}

const TABS = ['スコア', '弱点', '修正版3案', 'フック改善', 'コメント誘導', '画像案', '違和感案'] as const

export default function ReviewPage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('スコア')

  const analyze = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const json = await res.json()
      if (json.success) {
        setResult(json.data)
        setActiveTab('スコア')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="horror-title text-2xl font-bold text-red-500 mb-4">📝 投稿添削</h1>

      <div className="space-y-3 mb-4">
        <div>
          <label className="label-horror">添削したい投稿文を貼り付け</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="投稿文をここに貼り付けてください…"
            className="input-horror"
            rows={6}
          />
          <p className="text-xs text-gray-600 mt-1">{text.length}字</p>
        </div>
        <button onClick={analyze} disabled={loading || !text.trim()} className="w-full btn-red py-3">
          {loading ? '分析中…' : '添削・分析する'}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">総合スコア <span className="text-gray-200 font-bold ml-1">{result.score.total}/100</span></p>
            <SaveButton type="review" title={text.slice(0, 20) + '…添削'} input={text} output={result} />
          </div>

          <div className="flex gap-1 flex-wrap">
            {TABS.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`text-xs px-3 py-1 rounded transition-colors ${activeTab === t ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222]'}`}>
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'スコア' && (
            <div className="card">
              <ScoreCard score={result.score} />
            </div>
          )}

          {activeTab === '弱点' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-2">弱い理由・改善案</p>
              {result.review.weakPoints.map((p, i) => (
                <div key={i} className="card border-red-900/50">
                  <p className="text-sm text-red-300">⚠ {p}</p>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-3 mb-2">改善のポイント</p>
              {result.review.improvements.map((p, i) => (
                <div key={i} className="card">
                  <p className="text-sm text-gray-300">💡 {p}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === '修正版3案' && (
            <div className="space-y-3">
              {result.review.revised.map((r, i) => (
                <div key={i} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">案{i + 1}</span>
                    <CopyButton text={r} />
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans">{r}</pre>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'フック改善' && (
            <div className="space-y-2">
              {result.review.hookSuggestions.map((h, i) => (
                <div key={i} className="card flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-200 flex-1">{h}</p>
                  <CopyButton text={h} />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'コメント誘導' && (
            <div className="space-y-2">
              {result.review.commentPrompts.map((p, i) => (
                <div key={i} className="card flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-200 flex-1">{p}</p>
                  <CopyButton text={p} />
                </div>
              ))}
            </div>
          )}

          {activeTab === '画像案' && (
            <div className="card">
              <p className="text-sm text-gray-200">{result.review.imageSuggestion}</p>
              <div className="mt-2">
                <CopyButton text={result.review.imageSuggestion} />
              </div>
            </div>
          )}

          {activeTab === '違和感案' && (
            <div className="card">
              <OddityIdeas oddities={result.oddities} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
