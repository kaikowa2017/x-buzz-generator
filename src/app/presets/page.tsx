'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'

interface Preset {
  id: string
  name: string
  description: string
  sourceType: string
  features: string
  createdAt: string
}

interface FormData { name: string; description: string; features: string }

const DEFAULT_PRESETS = [
  { name: 'ぼそっと怖い', description: '短い文、淡々とした語り口、余韻重視', features: '{"style":"ぼそっと怖い","antiAI":"強","lineBreak":"普通","onomatopoeia":"少"}' },
  { name: 'ギャグホラー', description: '怖いはずなのに笑える、ズレた反応', features: '{"style":"ふざけ怖い","emoji":"少","colloquial":"強"}' },
  { name: '都市伝説風', description: '「実は○○だった」型の謎解き感', features: '{"style":"都市伝説風","hasHook":true,"ending":"考察"}' },
  { name: '2ch怪談風', description: '口語体、臨場感、スレッド風', features: '{"style":"2ch怪談風","colloquial":"強","antiAI":"強"}' },
  { name: '考察ホラー風', description: '論理的なのに不気味、謎が残る', features: '{"style":"考察勢","hasQuestion":true,"ending":"考察"}' },
  { name: '画像誘導型', description: '「次の画像を見てください」型', features: '{"hasHook":true,"postType":"画像付き投稿"}' },
]

export default function PresetsPage() {
  const [presets, setPresets] = useState<Preset[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Preset | null>(null)
  const { register, handleSubmit, reset, setValue } = useForm<FormData>()

  const load = async () => {
    const res = await fetch('/api/presets')
    const json = await res.json()
    if (json.success) setPresets(json.data)
  }

  useEffect(() => { load() }, [])

  const addDefault = async (p: typeof DEFAULT_PRESETS[0]) => {
    await fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: p.name, description: p.description, features: p.features }),
    })
    load()
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const url = editing ? `/api/presets/${editing.id}` : '/api/presets'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success) {
        reset()
        setShowForm(false)
        setEditing(null)
        load()
      }
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (p: Preset) => {
    setEditing(p)
    setValue('name', p.name)
    setValue('description', p.description)
    setValue('features', p.features)
    setShowForm(true)
  }

  const deletePreset = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/presets/${id}`, { method: 'DELETE' })
    load()
  }

  const parseFeatures = (f: string) => {
    try { return JSON.parse(f) } catch { return {} }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="horror-title text-2xl font-bold text-red-500">🎭 文体プリセット</h1>
        <button onClick={() => { setShowForm(v => !v); setEditing(null); reset() }} className="btn-red text-sm">
          {showForm ? '閉じる' : '+ 新規作成'}
        </button>
      </div>

      {presets.length === 0 && (
        <div className="card mb-4">
          <p className="text-sm text-gray-400 mb-3">デフォルトプリセットを追加できます</p>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_PRESETS.map(p => (
              <button
                key={p.name}
                onClick={() => addDefault(p)}
                className="text-xs px-3 py-1.5 border border-horror-border text-gray-400 hover:border-red-700 hover:text-red-400 rounded"
              >
                + {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="card mb-4 space-y-3">
          <p className="text-sm text-red-400 font-medium">{editing ? 'プリセット編集' : '新規プリセット作成'}</p>
          <div>
            <label className="label-horror">プリセット名 *</label>
            <input {...register('name', { required: true })} className="input-horror" placeholder="例：ぼそっと怖い" />
          </div>
          <div>
            <label className="label-horror">説明</label>
            <input {...register('description')} className="input-horror" placeholder="どんな文体か…" />
          </div>
          <div>
            <label className="label-horror">設定値 (JSON)</label>
            <textarea {...register('features')} className="input-horror font-mono text-xs" rows={4}
              placeholder='{"style":"ぼそっと怖い","antiAI":"強","onomatopoeia":"中"}' />
            <p className="text-xs text-gray-600 mt-1">設定できるキー: style, scaryLevel, ending, onomatopoeia, colloquial, antiAI, lineBreak, emoji, hasHook, hasQuestion</p>
          </div>
          <button type="submit" disabled={loading} className="w-full btn-red">
            {loading ? '保存中…' : editing ? '更新する' : '保存する'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {presets.map(p => {
          const features = parseFeatures(p.features)
          return (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-200">{p.name}</p>
                  {p.description && <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(p)} className="text-xs px-2 py-1 border border-horror-border text-gray-400 hover:border-yellow-700 hover:text-yellow-400 rounded">
                    編集
                  </button>
                  <button onClick={() => deletePreset(p.id)} className="text-xs px-2 py-1 border border-horror-border text-gray-500 hover:border-red-700 hover:text-red-400 rounded">
                    削除
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(features).slice(0, 6).map(([k, v]) => (
                  <span key={k} className="text-xs px-1.5 py-0.5 bg-[#1a1a1a] text-gray-400 rounded border border-horror-border">
                    {k}: {String(v)}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {presets.length === 0 && (
        <p className="text-center text-gray-600 py-8">プリセットがありません。上記から追加してください。</p>
      )}
    </div>
  )
}
