'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { CopyButton } from '@/components/ui/CopyButton'

interface BuzzPost {
  id: string
  text: string
  likes: number
  impressions: number
  genre: string
  memo: string
  hook: string
  charCount: number
  lineBreakCount: number
  hasQuestion: boolean
  onomatopoeiaCount: number
  emotionWords: string
  hasCommentPrompt: boolean
  hasFollowPrompt: boolean
  styleSummary: string
  createdAt: string
}

interface FormData {
  text: string
  likes: number
  impressions: number
  genre: string
  memo: string
}

export default function BuzzPage() {
  const [posts, setPosts] = useState<BuzzPost[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState<BuzzPost | null>(null)
  const [showForm, setShowForm] = useState(false)
  const { register, handleSubmit, reset } = useForm<FormData>()

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/buzz')
      const json = await res.json()
      if (json.success) setPosts(json.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onSubmit = async (data: FormData) => {
    setAdding(true)
    try {
      const res = await fetch('/api/buzz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success) {
        reset()
        setShowForm(false)
        load()
      }
    } finally {
      setAdding(false)
    }
  }

  const deletePost = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/buzz/${id}`, { method: 'DELETE' })
    if (selected?.id === id) setSelected(null)
    load()
  }

  const emotionWordsOf = (post: BuzzPost) => {
    try { return JSON.parse(post.emotionWords) as string[] } catch { return [] }
  }

  const avgLikes = posts.length ? Math.round(posts.reduce((a, p) => a + p.likes, 0) / posts.length) : 0
  const avgChars = posts.length ? Math.round(posts.reduce((a, p) => a + p.charCount, 0) / posts.length) : 0

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="horror-title text-2xl font-bold text-red-500">🔥 バズ投稿DB</h1>
        <button onClick={() => setShowForm(v => !v)} className="btn-red text-sm">
          {showForm ? '閉じる' : '+ 追加'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="card mb-4 space-y-3">
          <p className="text-sm text-red-400 font-medium">バズ投稿を手動追加</p>
          <div>
            <label className="label-horror">投稿文 *</label>
            <textarea {...register('text', { required: true })} className="input-horror" rows={4} placeholder="バズった投稿文を貼り付け…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-horror">いいね数</label>
              <input {...register('likes')} type="number" className="input-horror" placeholder="0" />
            </div>
            <div>
              <label className="label-horror">インプレッション</label>
              <input {...register('impressions')} type="number" className="input-horror" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-horror">ジャンル</label>
              <select {...register('genre')} className="input-horror">
                <option value="">未分類</option>
                {['心霊','都市伝説','意味怖','怪談','考察','ギャグホラー','画像系'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-horror">メモ</label>
              <input {...register('memo')} className="input-horror" placeholder="気づき…" />
            </div>
          </div>
          <button type="submit" disabled={adding} className="w-full btn-red">
            {adding ? '保存中…' : '保存・分析する'}
          </button>
        </form>
      )}

      {posts.length > 0 && (
        <div className="card mb-4">
          <p className="text-xs text-gray-500 mb-2">パターン分析 ({posts.length}件)</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-red-400">{avgLikes}</p>
              <p className="text-xs text-gray-500">平均いいね</p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-400">{avgChars}字</p>
              <p className="text-xs text-gray-500">平均文字数</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-400">
                {Math.round(posts.filter(p => p.hasQuestion).length / posts.length * 100)}%
              </p>
              <p className="text-xs text-gray-500">問いかけ率</p>
            </div>
          </div>
        </div>
      )}

      {loading && <p className="text-gray-500 text-sm">読み込み中…</p>}

      <div className="space-y-3">
        {posts.map(post => (
          <div
            key={post.id}
            className={`card cursor-pointer transition-colors ${selected?.id === post.id ? 'border-red-700' : 'hover:border-gray-600'}`}
            onClick={() => setSelected(selected?.id === post.id ? null : post)}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm text-gray-200 line-clamp-2 flex-1">{post.text}</p>
              <div className="flex gap-1 shrink-0">
                <CopyButton text={post.text} />
                <button
                  onClick={e => { e.stopPropagation(); deletePost(post.id) }}
                  className="text-xs px-2 py-1 border border-horror-border text-gray-500 hover:border-red-700 hover:text-red-400 rounded"
                >
                  削除
                </button>
              </div>
            </div>
            <div className="flex gap-3 text-xs text-gray-500">
              <span>❤️ {post.likes.toLocaleString()}</span>
              <span>👁 {post.impressions.toLocaleString()}</span>
              <span>{post.charCount}字</span>
              {post.genre && <span className="text-gray-600">{post.genre}</span>}
            </div>

            {selected?.id === post.id && (
              <div className="mt-3 pt-3 border-t border-horror-border space-y-2">
                <p className="text-xs text-red-400">分析結果</p>
                <p className="text-xs text-gray-400">文体: {post.styleSummary}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>改行数: <span className="text-gray-300">{post.lineBreakCount}</span></div>
                  <div>問いかけ: <span className="text-gray-300">{post.hasQuestion ? 'あり' : 'なし'}</span></div>
                  <div>オノマトペ: <span className="text-gray-300">{post.onomatopoeiaCount}個</span></div>
                  <div>コメ誘導: <span className="text-gray-300">{post.hasCommentPrompt ? 'あり' : 'なし'}</span></div>
                </div>
                {emotionWordsOf(post).length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">感情語</p>
                    <div className="flex gap-1 flex-wrap">
                      {emotionWordsOf(post).map((w, i) => (
                        <span key={i} className="text-xs px-1.5 py-0.5 bg-red-900/30 text-red-400 rounded">{w}</span>
                      ))}
                    </div>
                  </div>
                )}
                {post.hook && <p className="text-xs text-gray-500">冒頭: <span className="text-gray-300">「{post.hook}」</span></p>}
                {post.memo && <p className="text-xs text-gray-500">メモ: {post.memo}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {!loading && posts.length === 0 && (
        <p className="text-center text-gray-600 py-8">まだ投稿がありません。「+ 追加」からバズ投稿を登録してください。</p>
      )}
    </div>
  )
}
