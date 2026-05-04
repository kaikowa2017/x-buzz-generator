'use client'

import { useState, useEffect } from 'react'
import { CopyButton } from '@/components/ui/CopyButton'
import { SaveButton } from '@/components/ui/SaveButton'
import type {
  ScoreOutput,
  HookVariantsOutput,
  UncanninessOutput,
  FeedbackOutput,
  TemplateExtractOutput,
} from '@/lib/generator'

type TabKey = 'score' | 'hooks' | 'uncanny' | 'feedback' | 'templates'

const TABS: { key: TabKey; emoji: string; label: string }[] = [
  { key: 'score',     emoji: '📊', label: 'スコア' },
  { key: 'hooks',     emoji: '🎯', label: 'フックA/B/C' },
  { key: 'uncanny',   emoji: '👁️', label: '違和感' },
  { key: 'feedback',  emoji: '📈', label: '投稿後FB' },
  { key: 'templates', emoji: '🗂️', label: 'テンプレ' },
]

interface StoredTemplate {
  id: string; name: string; score: number; tags: string; example: string; structure: string
}

// ── helpers ──────────────────────────────────────────────────────

function GradeBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100)
  const color = pct >= 75 ? 'bg-green-600' : pct >= 50 ? 'bg-yellow-600' : 'bg-red-700'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300 font-mono">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── tab contents ─────────────────────────────────────────────────

function ScoreTab({ data }: { data: ScoreOutput }) {
  const gradeColor = { S: 'text-yellow-400', A: 'text-green-400', B: 'text-blue-400', C: 'text-orange-400', D: 'text-red-400' }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className={`text-5xl font-bold ${gradeColor[data.grade]}`}>{data.grade}</p>
          <p className="text-xs text-gray-500 mt-1">グレード</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-200">{data.total}<span className="text-sm text-gray-500">/100</span></p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">{data.verdict}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-gray-500">スコア内訳</p>
        <GradeBar label="フック力"    value={data.breakdown.hook}        max={15} />
        <GradeBar label="違和感"      value={data.breakdown.uncanny}     max={15} />
        <GradeBar label="具体性"      value={data.breakdown.specificity} max={15} />
        <GradeBar label="感情の強さ"  value={data.breakdown.emotion}     max={15} />
        <GradeBar label="保存性"      value={data.breakdown.saveability} max={15} />
        <GradeBar label="コメント誘導" value={data.breakdown.commentLead} max={15} />
        <GradeBar label="フォロー導線" value={data.breakdown.followLead}  max={10} />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-gray-500">改善ポイント（優先順）</p>
        {data.improvements.map((imp, i) => (
          <div key={i} className="flex gap-2 bg-[#0d0d0d] rounded p-2.5">
            <span className="text-red-500 text-xs shrink-0">#{i + 1}</span>
            <p className="text-xs text-gray-300">{imp}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">修正版（改善適用済み）</p>
          <CopyButton text={data.revised} />
        </div>
        <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed bg-[#0d0d0d] rounded p-3">
          {data.revised}
        </pre>
      </div>
    </div>
  )
}

function HooksTab({ data }: { data: HookVariantsOutput }) {
  const typeColors = { '安全': 'border-green-800 text-green-400', '強め': 'border-yellow-800 text-yellow-400', '攻め': 'border-red-800 text-red-400' }
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">テーマ: <span className="text-gray-300">{data.subject}</span></p>
      {data.variants.map(v => (
        <div key={v.type} className={`card border ${typeColors[v.type]}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold ${typeColors[v.type].split(' ')[1]}`}>{v.type}</span>
            <CopyButton text={v.hook} />
          </div>
          <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed mb-3">
            {v.hook}
          </pre>
          <p className="text-xs text-gray-500 border-t border-horror-border pt-2">{v.reason}</p>
        </div>
      ))}
    </div>
  )
}

function UncannyTab({ data }: { data: UncanninessOutput }) {
  const [active, setActive] = useState(0)
  const item = data.items[active]
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">対象: <span className="text-gray-300">{data.subject}</span></p>
      <div className="flex gap-1 flex-wrap">
        {data.items.map((it, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`text-xs px-3 py-1 rounded transition-colors ${active === i ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222]'}`}
          >
            {it.title}
          </button>
        ))}
      </div>
      {item && (
        <div className="space-y-3">
          <div className="bg-[#0d0d0d] rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-red-400">{item.title}</span>
              <CopyButton text={item.description} />
            </div>
            <p className="text-sm text-gray-200 leading-relaxed">{item.description}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="bg-[#0d0d0d] rounded p-3">
              <p className="text-xs text-gray-500 mb-1">🎨 画像での使い方</p>
              <p className="text-xs text-gray-300 leading-relaxed">{item.imageUse}</p>
            </div>
            <div className="bg-[#0d0d0d] rounded p-3">
              <p className="text-xs text-gray-500 mb-1">📚 漫画での使い方</p>
              <p className="text-xs text-gray-300 leading-relaxed">{item.mangaUse}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FeedbackTab({
  postText,
  onAnalyze,
}: {
  postText: string
  onAnalyze: (likes: number, impressions: number) => Promise<FeedbackOutput | null>
}) {
  const [likes, setLikes] = useState('')
  const [impressions, setImpressions] = useState('')
  const [result, setResult] = useState<FeedbackOutput | null>(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    const r = await onAnalyze(Number(likes) || 0, Number(impressions) || 0)
    if (r) setResult(r)
    setLoading(false)
  }

  const levelColors: Record<string, string> = {
    バズ: 'text-yellow-400',
    好調: 'text-green-400',
    普通: 'text-gray-300',
    低調: 'text-red-400',
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#0d0d0d] rounded p-3">
        <p className="text-xs text-gray-500 mb-3">実際の数値を入力してください</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-horror">いいね数</label>
            <input
              type="number"
              value={likes}
              onChange={e => setLikes(e.target.value)}
              placeholder="例: 1200"
              className="input-horror"
              min="0"
            />
          </div>
          <div>
            <label className="label-horror">インプレッション</label>
            <input
              type="number"
              value={impressions}
              onChange={e => setImpressions(e.target.value)}
              placeholder="例: 50000"
              className="input-horror"
              min="0"
            />
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading || (!likes && !impressions)}
          className="w-full btn-red mt-3"
        >
          {loading ? '分析中…' : 'フィードバック分析'}
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="bg-[#0d0d0d] rounded p-3 flex items-center gap-3">
            <div>
              <p className={`text-2xl font-bold ${levelColors[result.level] ?? 'text-gray-300'}`}>
                {result.level}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{result.levelLabel}</p>
            </div>
          </div>

          {result.strengths.length > 0 && (
            <div>
              <p className="text-xs text-green-500 mb-1">✓ 伸びた理由</p>
              {result.strengths.map((s, i) => (
                <p key={i} className="text-xs text-gray-300 bg-[#0d0d0d] rounded p-2 mb-1">{s}</p>
              ))}
            </div>
          )}

          {result.weaknesses.length > 0 && (
            <div>
              <p className="text-xs text-red-400 mb-1">✗ 改善点</p>
              {result.weaknesses.map((w, i) => (
                <p key={i} className="text-xs text-gray-300 bg-[#0d0d0d] rounded p-2 mb-1">{w}</p>
              ))}
            </div>
          )}

          <div className="bg-[#0d0d0d] rounded p-3 space-y-2">
            <p className="text-xs text-gray-500">次のアクション</p>
            <p className="text-sm text-yellow-300">{result.nextAction}</p>
          </div>
          <div className="bg-[#0d0d0d] rounded p-3">
            <p className="text-xs text-gray-500 mb-1">次の投稿のヒント</p>
            <p className="text-sm text-gray-200">{result.nextPostHint}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function TemplateTab({
  data,
  onSave,
  onDeleteSaved,
  savedTemplates,
}: {
  data: TemplateExtractOutput | null
  onSave: () => Promise<void>
  onDeleteSaved: (id: string) => Promise<void>
  savedTemplates: StoredTemplate[]
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  if (!data) return <p className="text-gray-500 text-sm">「分析する」を実行してください。</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-200">{data.name}</p>
          <div className="flex gap-1 mt-1 flex-wrap">
            {data.structure.tags.map(t => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 bg-red-900/30 text-red-400 rounded">{t}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`text-xs px-3 py-1.5 rounded border transition-all ${
              saved
                ? 'border-green-600 text-green-400 bg-green-900/20'
                : 'border-horror-border text-gray-400 hover:border-yellow-600 hover:text-yellow-400'
            }`}
          >
            {saving ? '保存中…' : saved ? '✓ 保存済み' : 'DBに保存'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {[
          { label: 'フック', value: data.structure.hook },
          { label: '本文', value: data.structure.body },
          { label: 'オチ・転換', value: data.structure.twist },
          { label: 'CTA', value: data.structure.cta || '（なし）' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#0d0d0d] rounded p-2.5">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-xs text-gray-300 leading-relaxed">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0d0d0d] rounded p-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-500">テンプレート（抽象化）</p>
          <CopyButton text={data.structure.abstract} />
        </div>
        <pre className="whitespace-pre-wrap text-xs text-green-400 font-mono leading-relaxed">
          {data.structure.abstract}
        </pre>
      </div>

      {savedTemplates.length > 0 && (
        <div>
          <button
            onClick={() => setShowSaved(v => !v)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showSaved ? '▲ 保存済みテンプレを隠す' : `▼ 保存済みテンプレ (${savedTemplates.length}件)`}
          </button>
          {showSaved && (
            <div className="mt-2 space-y-2">
              {savedTemplates.map(t => {
                let tags: string[] = []
                try { tags = JSON.parse(t.tags) } catch { /**/ }
                return (
                  <div key={t.id} className="bg-[#0d0d0d] rounded p-2.5 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-gray-200">{t.name}</p>
                        <span className="text-xs text-gray-600">スコア {t.score}</span>
                      </div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {tags.map(tag => (
                          <span key={tag} className="text-[10px] px-1 py-0.5 bg-[#1a1a1a] text-gray-500 rounded">{tag}</span>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1 truncate">{t.example.slice(0, 60)}</p>
                    </div>
                    <button
                      onClick={() => onDeleteSaved(t.id)}
                      className="text-xs text-gray-600 hover:text-red-400 shrink-0"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────

export default function WinPage() {
  const [text, setText] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('score')
  const [loading, setLoading] = useState(false)

  const [scoreData, setScoreData] = useState<ScoreOutput | null>(null)
  const [hooksData, setHooksData] = useState<HookVariantsOutput | null>(null)
  const [uncannyData, setUncannyData] = useState<UncanninessOutput | null>(null)
  const [templateData, setTemplateData] = useState<TemplateExtractOutput | null>(null)
  const [savedTemplates, setSavedTemplates] = useState<StoredTemplate[]>([])

  useEffect(() => {
    fetch('/api/win/templates')
      .then(r => r.json())
      .then(j => { if (j.success) setSavedTemplates(j.data) })
      .catch(() => {/**/})
  }, [])

  const analyze = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      const [scoreRes, hooksRes, uncannyRes, tmplRes] = await Promise.all([
        fetch('/api/win/score',   { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }),
        fetch('/api/win/hooks',   { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }),
        fetch('/api/win/uncanny', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }),
        fetch('/api/win/template',{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }),
      ])
      const [s, h, u, t] = await Promise.all([scoreRes.json(), hooksRes.json(), uncannyRes.json(), tmplRes.json()])
      if (s.success) setScoreData(s.data)
      if (h.success) setHooksData(h.data)
      if (u.success) setUncannyData(u.data)
      if (t.success) setTemplateData(t.data)
      setActiveTab('score')
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = async (likes: number, impressions: number) => {
    const res = await fetch('/api/win/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, likes, impressions }),
    })
    const json = await res.json()
    return json.success ? json.data : null
  }

  const handleSaveTemplate = async () => {
    const res = await fetch('/api/win/template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, save: true }),
    })
    const json = await res.json()
    if (json.success) {
      const r = await fetch('/api/win/templates')
      const j = await r.json()
      if (j.success) setSavedTemplates(j.data)
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/win/templates/${id}`, { method: 'DELETE' })
    setSavedTemplates(prev => prev.filter(t => t.id !== id))
  }

  const hasResult = scoreData || hooksData || uncannyData || templateData

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="horror-title text-2xl font-bold text-red-500">⚡ 勝率UP</h1>
        <p className="text-xs text-gray-500 mt-1">投稿を貼り付けてスコア・フック・違和感・フィードバックを一括分析</p>
      </div>

      {/* input */}
      <div className="space-y-3 mb-5">
        <div>
          <label className="label-horror">分析する投稿文</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="投稿文をここに貼り付けてください…&#10;（生成した投稿でも、実際に投稿したものでも OK）"
            className="input-horror"
            rows={6}
          />
          <p className="text-xs text-gray-600 mt-1">{text.length}字</p>
        </div>
        <button
          onClick={analyze}
          disabled={loading || !text.trim()}
          className="w-full btn-red py-3 font-bold"
        >
          {loading ? '分析中…（4項目並列）' : '分析する（スコア／フック3種／違和感／テンプレ）'}
        </button>
      </div>

      {/* results */}
      {hasResult && (
        <div className="space-y-3">
          {/* tab bar */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`shrink-0 flex items-center gap-1 text-xs px-3 py-2 rounded transition-colors ${
                  activeTab === t.key ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222]'
                }`}
              >
                <span>{t.emoji}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
            <div className="ml-auto shrink-0">
              <SaveButton
                type="win"
                title={`勝率分析 ${text.slice(0, 20)}…`}
                input={{ text }}
                output={{ score: scoreData, hooks: hooksData, uncanny: uncannyData, template: templateData }}
              />
            </div>
          </div>

          {/* tab content */}
          <div className="card">
            {activeTab === 'score'     && scoreData    && <ScoreTab   data={scoreData} />}
            {activeTab === 'hooks'     && hooksData    && <HooksTab   data={hooksData} />}
            {activeTab === 'uncanny'   && uncannyData  && <UncannyTab data={uncannyData} />}
            {activeTab === 'feedback'  && (
              <FeedbackTab postText={text} onAnalyze={handleFeedback} />
            )}
            {activeTab === 'templates' && (
              <TemplateTab
                data={templateData}
                onSave={handleSaveTemplate}
                onDeleteSaved={handleDeleteTemplate}
                savedTemplates={savedTemplates}
              />
            )}
          </div>
        </div>
      )}

      {/* feedback tab accessible even without analysis */}
      {!hasResult && (
        <div className="card mt-4">
          <p className="text-xs text-gray-500 mb-3">📈 投稿後フィードバックのみ使いたい場合</p>
          <FeedbackTab postText={text} onAnalyze={handleFeedback} />
        </div>
      )}
    </div>
  )
}
