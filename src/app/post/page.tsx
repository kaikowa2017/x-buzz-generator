'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { CopyButton } from '@/components/ui/CopyButton'
import { SaveButton } from '@/components/ui/SaveButton'
import { Collapsible } from '@/components/ui/Collapsible'
import { ScoreCard } from '@/components/ui/ScoreCard'
import { OddityIdeas } from '@/components/ui/OddityIdeas'
import type { PostInput, AllGenerationOutput, HookOutput, ImagePromptOutput, VideoPromptOutput } from '@/lib/generator'

type FormData = PostInput

// ─── Preset types ────────────────────────────────────────────────

interface StoredPreset {
  id: string
  name: string
  description: string
  features: string
}

// Keys that a preset is allowed to override in the form
type PresetFeatures = Partial<Pick<FormData,
  | 'style' | 'scaryLevel' | 'ending' | 'postType' | 'charPreset'
  | 'onomatopoeia' | 'colloquial' | 'antiAI' | 'lineBreak' | 'emoji'
  | 'hasHook' | 'hasQuestion' | 'hasCommentPrompt' | 'hasFollowPrompt' | 'hasBlogGuide'
>>

const DEFAULTS: FormData = {
  keyword: '',
  postType: '短文ポスト',
  charPreset: '普通',
  minChars: 120,
  maxChars: 280,
  targetChars: 200,
  scaryLevel: '普通',
  ending: '考察',
  style: 'ぼそっと怖い',
  onomatopoeia: '中',
  colloquial: '中',
  antiAI: '強',
  lineBreak: '普通',
  emoji: 'なし',
  hasHook: true,
  hasQuestion: true,
  hasCommentPrompt: false,
  hasFollowPrompt: false,
  hasBlogGuide: false,
  usePatterns: true,
}

type TabKey = 'post' | 'hooks' | 'review' | 'images' | 'videos'

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'post',   label: '投稿',         emoji: '✍️' },
  { key: 'hooks',  label: 'フック',       emoji: '🔗' },
  { key: 'review', label: '添削',         emoji: '📊' },
  { key: 'images', label: '画像プロンプト', emoji: '🎨' },
  { key: 'videos', label: '動画プロンプト', emoji: '🎬' },
]

// ── sub-components ──────────────────────────────────────────────

function PostTab({ post }: { post: AllGenerationOutput['post'] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{post.charCount}字</span>
        <div className="flex gap-2">
          <CopyButton text={post.text} />
        </div>
      </div>
      <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed bg-[#0d0d0d] rounded p-3">
        {post.text}
      </pre>
      {post.hookUsed && (
        <p className="text-xs text-gray-600">使用フック: {post.hookUsed}</p>
      )}
      {post.tips.length > 0 && (
        <div className="space-y-1">
          {post.tips.map((tip, i) => (
            <p key={i} className="text-xs text-yellow-600">• {tip}</p>
          ))}
        </div>
      )}
    </div>
  )
}

// ── HooksTab: カテゴリ一覧 + A/B/C バリアント ────────────────
function HooksTab({ hooks, hookVariants }: {
  hooks: HookOutput[]
  hookVariants: AllGenerationOutput['hookVariants']
}) {
  const [mode, setMode] = useState<'abc' | 'category'>('abc')
  const [activeCategory, setActiveCategory] = useState(0)

  const TYPE_COLOR: Record<string, string> = {
    '安全': 'border-green-800 text-green-400',
    '強め': 'border-yellow-800 text-yellow-400',
    '攻め': 'border-red-800 text-red-400',
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setMode('abc')}
          className={`text-xs px-3 py-1 rounded transition-colors ${mode === 'abc' ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400'}`}>
          A/B/C バリアント
        </button>
        <button onClick={() => setMode('category')}
          className={`text-xs px-3 py-1 rounded transition-colors ${mode === 'category' ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400'}`}>
          カテゴリ一覧
        </button>
      </div>

      {mode === 'abc' && (
        <div className="space-y-3">
          {hookVariants.variants.map(v => (
            <div key={v.type} className={`card border ${TYPE_COLOR[v.type] ?? 'border-horror-border'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-bold ${TYPE_COLOR[v.type]?.split(' ')[1] ?? 'text-gray-400'}`}>
                  タイプ {v.type === '安全' ? 'A' : v.type === '強め' ? 'B' : 'C'} — {v.type}
                </span>
                <CopyButton text={v.hook} />
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed mb-2">{v.hook}</pre>
              <p className="text-xs text-gray-500 border-t border-horror-border pt-2">{v.reason}</p>
            </div>
          ))}
        </div>
      )}

      {mode === 'category' && (
        <div className="space-y-3">
          <div className="flex gap-1 flex-wrap">
            {hooks.map((h, i) => (
              <button key={i} onClick={() => setActiveCategory(i)}
                className={`text-xs px-2 py-1 rounded transition-colors ${activeCategory === i ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222]'}`}>
                {h.category}
              </button>
            ))}
          </div>
          {hooks[activeCategory] && (
            <div className="space-y-2">
              {hooks[activeCategory].hooks.map((hook, i) => (
                <div key={i} className="flex items-center justify-between gap-3 bg-[#0d0d0d] rounded p-2.5">
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

// ── ReviewTab: スコアカード + 既存添削 ────────────────────────
function ReviewTab({ review, score }: {
  review: AllGenerationOutput['review']
  score: AllGenerationOutput['score']
}) {
  const [sub, setSub] = useState<'score' | 'weak' | 'revised' | 'hook'>('score')
  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {(['score', 'weak', 'revised', 'hook'] as const).map(s => (
          <button key={s} onClick={() => setSub(s)}
            className={`text-xs px-2 py-1 rounded transition-colors ${sub === s ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400'}`}>
            {s === 'score' ? 'スコア' : s === 'weak' ? '弱点' : s === 'revised' ? '修正版' : 'フック'}
          </button>
        ))}
      </div>

      {sub === 'score' && <ScoreCard score={score} />}

      {sub === 'weak' && (
        <div className="space-y-2">
          {review.weakPoints.map((p, i) => (
            <p key={i} className="text-xs text-red-300 bg-[#0d0d0d] rounded p-2">⚠ {p}</p>
          ))}
          <div className="mt-2 space-y-1">
            {review.improvements.map((p, i) => (
              <p key={i} className="text-xs text-gray-400">💡 {p}</p>
            ))}
          </div>
        </div>
      )}

      {sub === 'revised' && (
        <div className="space-y-3">
          {review.revised.map((r, i) => (
            <div key={i} className="bg-[#0d0d0d] rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">修正案{i + 1}</span>
                <CopyButton text={r} />
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans">{r}</pre>
            </div>
          ))}
        </div>
      )}

      {sub === 'hook' && (
        <div className="space-y-2">
          {review.hookSuggestions.map((h, i) => (
            <div key={i} className="flex items-center justify-between gap-3 bg-[#0d0d0d] rounded p-2.5">
              <p className="text-sm text-gray-200 flex-1">{h}</p>
              <CopyButton text={h} />
            </div>
          ))}
          <p className="text-xs text-gray-500 mt-2">{review.imageSuggestion}</p>
        </div>
      )}
    </div>
  )
}

// ── ImagesTab: プロンプト + 違和感案 ─────────────────────────
function ImagesTab({ images, scene, oddities }: {
  images: ImagePromptOutput[]
  scene: AllGenerationOutput['scene']
  oddities: AllGenerationOutput['oddities']
}) {
  const [activeIdx, setActiveIdx] = useState(0)
  const current = images[activeIdx]
  const labels = images.map((img, i) => ({ label: img.type, i }))

  return (
    <div className="space-y-3">
      <div className="bg-[#0d0d0d] rounded p-2 text-xs text-gray-400">
        <span className="text-red-400">抽出シーン：</span>
        {scene.location} / {scene.entity} / {scene.time}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {labels.map(({ label, i }) => (
          <button key={i} onClick={() => setActiveIdx(i)}
            className={`shrink-0 text-xs px-2 py-1 rounded transition-colors ${activeIdx === i ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222]'}`}>
            {label}
          </button>
        ))}
      </div>

      {current && (
        <div className="space-y-3">
          <div className="bg-[#0d0d0d] rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">日本語プロンプト</span>
              <CopyButton text={current.jaPrompt} />
            </div>
            <p className="text-sm text-gray-200 leading-relaxed">{current.jaPrompt}</p>
          </div>
          <div className="bg-[#0d0d0d] rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">英語プロンプト</span>
              <CopyButton text={current.enPrompt} />
            </div>
            <p className="text-xs font-mono text-green-400 leading-relaxed whitespace-pre-wrap">{current.enPrompt}</p>
          </div>
          <div className="bg-[#0d0d0d] rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">ネガティブプロンプト</span>
              <CopyButton text={current.negativePrompt} />
            </div>
            <p className="text-xs text-red-300">{current.negativePrompt}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#0d0d0d] rounded p-2">
              <p className="text-xs text-gray-500 mb-1">構図</p>
              <p className="text-xs text-gray-300">{current.composition}</p>
            </div>
            <div className="bg-[#0d0d0d] rounded p-2">
              <p className="text-xs text-gray-500 mb-1">違和感ポイント</p>
              <p className="text-xs text-red-300">{current.uncanny}</p>
            </div>
          </div>
          {current.textIdea && (
            <div className="bg-[#0d0d0d] rounded p-2">
              <p className="text-xs text-gray-500 mb-1">画像内テキスト案</p>
              <p className="text-sm text-yellow-400">{current.textIdea}</p>
            </div>
          )}
        </div>
      )}

      {/* 違和感案 */}
      <div className="border-t border-horror-border pt-3">
        <OddityIdeas oddities={oddities} />
      </div>
    </div>
  )
}

function VideosTab({ videos, scene }: { videos: VideoPromptOutput[]; scene: AllGenerationOutput['scene'] }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const current = videos[activeIdx]
  return (
    <div className="space-y-3">
      <div className="bg-[#0d0d0d] rounded p-2 text-xs text-gray-400">
        <span className="text-red-400">抽出シーン：</span>
        {scene.primary} — {scene.entity}が{scene.action}
      </div>

      <div className="flex gap-2">
        {videos.map((v, i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            className={`text-xs px-3 py-1.5 rounded transition-colors ${
              activeIdx === i ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222]'
            }`}
          >
            {v.tool}
          </button>
        ))}
      </div>

      {current && (
        <div className="space-y-3">
          <p className="text-xs text-red-400">{current.tool} / 目安{current.durationSec}秒</p>

          <div className="bg-[#0d0d0d] rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">日本語プロンプト</span>
              <CopyButton text={current.jaPrompt} />
            </div>
            <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{current.jaPrompt}</p>
          </div>

          <div className="bg-[#0d0d0d] rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">英語プロンプト</span>
              <CopyButton text={current.enPrompt} />
            </div>
            <p className="text-xs font-mono text-green-400 leading-relaxed whitespace-pre-wrap">{current.enPrompt}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#0d0d0d] rounded p-2">
              <p className="text-xs text-gray-500 mb-1">カメラワーク</p>
              <p className="text-xs text-gray-300">{current.camera}</p>
            </div>
            <div className="bg-[#0d0d0d] rounded p-2">
              <p className="text-xs text-gray-500 mb-1">動き</p>
              <p className="text-xs text-gray-300">{current.movement}</p>
            </div>
            <div className="bg-[#0d0d0d] rounded p-2">
              <p className="text-xs text-gray-500 mb-1">音</p>
              <p className="text-xs text-gray-300">{current.sound}</p>
            </div>
            <div className="bg-[#0d0d0d] rounded p-2">
              <p className="text-xs text-gray-500 mb-1">雰囲気</p>
              <p className="text-xs text-gray-300">{current.atmosphere}</p>
            </div>
          </div>

          <div className="bg-[#0d0d0d] rounded p-2 border border-red-900/40">
            <p className="text-xs text-gray-500 mb-1">ラストの違和感</p>
            <p className="text-sm text-red-300">{current.finalUncanny}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────

// Must match the key written in /history/page.tsx
const RESTORE_KEY = 'horror-post-restore'

export default function PostPage() {
  const { register, handleSubmit, watch, setValue } = useForm<FormData>({ defaultValues: DEFAULTS })
  const [result, setResult] = useState<AllGenerationOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>(DEFAULTS)
  const [activeTab, setActiveTab] = useState<TabKey>('post')
  const [presets, setPresets] = useState<StoredPreset[]>([])
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null)
  const [restoredFrom, setRestoredFrom] = useState<string | null>(null)

  const charPreset = watch('charPreset')

  // ── restore from history (localStorage written by /history page) ──
  useEffect(() => {
    const raw = localStorage.getItem(RESTORE_KEY)
    if (!raw) return
    localStorage.removeItem(RESTORE_KEY)           // consume once
    try {
      const saved = JSON.parse(raw) as Partial<FormData>
      ;(Object.keys(saved) as (keyof FormData)[]).forEach(key => {
        if (key in DEFAULTS) setValue(key, saved[key] as never)
      })
      const kw = (saved as { keyword?: string }).keyword
      setRestoredFrom(kw ? `キーワード「${kw}」` : '前回の設定')
      setAppliedPresetId(null)   // preset selector is independent
    } catch { /* malformed — ignore */ }
  }, [setValue])

  // ── load presets once on mount ──
  useEffect(() => {
    fetch('/api/presets')
      .then(r => r.json())
      .then(j => { if (j.success) setPresets(j.data) })
      .catch(() => {/* ignore */})
  }, [])

  // ── apply a preset: parse features JSON and override matching form fields ──
  const applyPreset = (preset: StoredPreset) => {
    try {
      const features = JSON.parse(preset.features) as PresetFeatures
      ;(Object.keys(features) as (keyof PresetFeatures)[]).forEach(key => {
        setValue(key, features[key] as never)
      })
      setAppliedPresetId(preset.id)
    } catch {
      // malformed JSON — skip silently
    }
  }

  const clearPreset = () => {
    // restore every overridable field to the default value
    const keys: (keyof PresetFeatures)[] = [
      'style','scaryLevel','ending','postType','charPreset',
      'onomatopoeia','colloquial','antiAI','lineBreak','emoji',
      'hasHook','hasQuestion','hasCommentPrompt','hasFollowPrompt','hasBlogGuide',
    ]
    keys.forEach(key => setValue(key, DEFAULTS[key] as never))
    setAppliedPresetId(null)
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setFormData(data)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success) {
        setResult(json.data)
        setActiveTab('post')
      } else {
        alert('エラー: ' + json.error)
      }
    } catch {
      alert('通信エラー')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="horror-title text-2xl font-bold text-red-500 mb-4">✍️ 投稿生成</h1>

      {/* ── Restored-from-history banner ── */}
      {restoredFrom && (
        <div className="flex items-center justify-between bg-blue-950/40 border border-blue-800 rounded-lg px-4 py-2.5 mb-4">
          <p className="text-xs text-blue-300">
            ↩ 履歴から復元しました — {restoredFrom}
          </p>
          <button
            type="button"
            onClick={() => {
              setRestoredFrom(null)
              clearPreset()
            }}
            className="text-xs text-blue-500 hover:text-blue-300 transition-colors ml-4"
          >
            ✕ 閉じる
          </button>
        </div>
      )}

      {/* ── Form ── */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6">
        <div>
          <label className="label-horror">キーワード（任意）</label>
          <input
            {...register('keyword')}
            placeholder="例：学校の怪談、心霊写真、呪いの人形… ← ここがそのまま画像・動画テーマになります"
            className="input-horror"
          />
        </div>

        {/* ── Preset selector ── */}
        {presets.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label-horror mb-0">文体プリセット</label>
              {appliedPresetId && (
                <button
                  type="button"
                  onClick={clearPreset}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  ✕ 解除してデフォルトに戻す
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {presets.map(p => {
                const isActive = appliedPresetId === p.id
                // show which keys the preset touches
                let featureKeys: string[] = []
                try { featureKeys = Object.keys(JSON.parse(p.features)) } catch { /**/ }
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => isActive ? clearPreset() : applyPreset(p)}
                    title={p.description || featureKeys.join(' / ')}
                    className={`flex flex-col items-start px-3 py-2 rounded border text-left transition-colors ${
                      isActive
                        ? 'border-red-500 bg-red-950/40 text-red-300'
                        : 'border-horror-border text-gray-400 hover:border-gray-500 hover:text-gray-200'
                    }`}
                  >
                    <span className="text-xs font-medium">{p.name}</span>
                    {featureKeys.length > 0 && (
                      <span className="text-[10px] text-gray-600 mt-0.5">
                        {featureKeys.slice(0, 4).join(' · ')}{featureKeys.length > 4 ? ' …' : ''}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {appliedPresetId && (
              <p className="text-xs text-red-400 mt-1.5">
                ✓ プリセット適用中 — 下の設定が上書きされています
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-horror">投稿タイプ</label>
            <select {...register('postType')} className="input-horror">
              {['短文ポスト','意味怖','考察誘導','ブログ誘導','X記事','漫画構成','画像付き投稿','動画付き投稿'].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-horror">文体スタイル</label>
            <select {...register('style')} className="input-horror">
              {['ぼそっと怖い','友達口調','怪談師','考察勢','ふざけ怖い','都市伝説風','2ch怪談風'].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-horror">怖さ</label>
            <select {...register('scaryLevel')} className="input-horror">
              {['軽い','普通','ガチ怖'].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label-horror">オチ</label>
            <select {...register('ending')} className="input-horror">
              {['怖い','ギャグ','意味怖','考察'].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label-horror">文字数プリセット</label>
          <div className="flex flex-wrap gap-2">
            {(['短い','普通','長文','X記事','カスタム'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setValue('charPreset', p)}
                className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                  charPreset === p
                    ? 'border-red-500 text-red-400 bg-red-900/20'
                    : 'border-horror-border text-gray-400 hover:border-gray-500'
                }`}
              >
                {p === '短い' ? '短い 40〜120' : p === '普通' ? '普通 120〜280' : p === '長文' ? '長文 280〜800' : p === 'X記事' ? 'X記事 800〜2000' : 'カスタム'}
              </button>
            ))}
          </div>
        </div>

        <Collapsible title="詳細設定">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-horror">オノマトペ量</label>
              <select {...register('onomatopoeia')} className="input-horror">
                {['なし','少','中','多'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label-horror">口語レベル</label>
              <select {...register('colloquial')} className="input-horror">
                {['弱','中','強'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label-horror">AIっぽさ除去</label>
              <select {...register('antiAI')} className="input-horror">
                {['弱','中','強'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label-horror">改行量</label>
              <select {...register('lineBreak')} className="input-horror">
                {['少','普通','多'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label-horror">絵文字量</label>
              <select {...register('emoji')} className="input-horror">
                {['なし','少','多'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {([
              ['hasHook',         '冒頭フックあり'],
              ['hasQuestion',     '最後に問いかけあり'],
              ['hasCommentPrompt','コメント誘導あり'],
              ['hasFollowPrompt', 'フォロー導線あり'],
              ['hasBlogGuide',    'ブログ誘導あり'],
              ['usePatterns',     '参考パターン使用（バズDBから）'],
            ] as const).map(([field, label]) => (
              <label key={field} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" {...register(field)} className="accent-red-500" />
                {label}
              </label>
            ))}
          </div>
        </Collapsible>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-red py-3 text-base font-bold"
        >
          {loading ? '生成中…（投稿＋フック＋添削＋画像＋動画）' : '生成する（5項目同時出力）'}
        </button>
      </form>

      {/* ── Result Tabs ── */}
      {result && (
        <div className="space-y-3">
          {/* Tab Header */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`shrink-0 flex items-center gap-1 text-xs px-3 py-2 rounded transition-colors ${
                    activeTab === t.key
                      ? 'bg-red-700 text-white'
                      : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222]'
                  }`}
                >
                  <span>{t.emoji}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>
            <SaveButton
              type="post"
              title={result.post.text.slice(0, 30) + '…'}
              input={formData}
              output={result}
            />
          </div>

          {/* Tab Content */}
          <div className="card">
            {activeTab === 'post'   && <PostTab   post={result.post} />}
            {activeTab === 'hooks'  && <HooksTab  hooks={result.hooks} hookVariants={result.hookVariants} />}
            {activeTab === 'review' && <ReviewTab review={result.review} score={result.score} />}
            {activeTab === 'images' && <ImagesTab images={result.images} scene={result.scene} oddities={result.oddities} />}
            {activeTab === 'videos' && <VideosTab videos={result.videos} scene={result.scene} />}
          </div>

          {/* Re-generate */}
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="w-full border border-horror-border text-gray-400 hover:border-gray-500 hover:text-gray-200 py-2 rounded text-sm transition-colors"
          >
            再生成
          </button>
        </div>
      )}
    </div>
  )
}
