'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'

interface Account {
  id: string
  name: string
  xId: string
  genre: string
  reason: string
  memo: string
  posts: { id: string; text: string; createdAt: string }[]
}

interface AccountForm { name: string; xId: string; genre: string; reason: string; memo: string }
interface Analysis { avgCharCount?: number; summary?: string; questionFreq?: string }

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selected, setSelected] = useState<Account | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [postText, setPostText] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset } = useForm<AccountForm>()

  const load = async () => {
    const res = await fetch('/api/accounts')
    const json = await res.json()
    if (json.success) setAccounts(json.data)
  }

  useEffect(() => { load() }, [])

  const onSubmit = async (data: AccountForm) => {
    setLoading(true)
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success) { reset(); setShowForm(false); load() }
    } finally {
      setLoading(false)
    }
  }

  const deleteAccount = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    if (selected?.id === id) setSelected(null)
    load()
  }

  const addPost = async (accountId: string) => {
    if (!postText.trim()) return
    await fetch(`/api/accounts/${accountId}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: postText }),
    })
    setPostText('')
    const res = await fetch(`/api/accounts/${accountId}/posts`)
    const json = await res.json()
    if (json.success) {
      setAnalysis(json.data.analysis)
      load()
    }
  }

  const deletePost = async (accountId: string, postId: string) => {
    await fetch(`/api/accounts/${accountId}/posts`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    })
    load()
  }

  const makePreset = async (account: Account) => {
    const texts = account.posts.map(p => p.text)
    if (texts.length === 0) return alert('投稿を追加してから文体プリセット化してください')
    const res = await fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `@${account.xId}の文体`,
        description: `${account.name}の投稿から抽出`,
        sourceType: 'account',
        sourceId: account.id,
        features: JSON.stringify({ texts: texts.slice(0, 5), summary: analysis?.summary }),
      }),
    })
    const json = await res.json()
    if (json.success) alert('文体プリセットを保存しました！')
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="horror-title text-2xl font-bold text-red-500">👤 参考アカウント管理</h1>
        <button onClick={() => setShowForm(v => !v)} className="btn-red text-sm">
          {showForm ? '閉じる' : '+ 追加'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="card mb-4 space-y-3">
          <p className="text-sm text-red-400 font-medium">アカウント追加</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-horror">アカウント名 *</label>
              <input {...register('name', { required: true })} className="input-horror" placeholder="ホラー太郎" />
            </div>
            <div>
              <label className="label-horror">X ID *</label>
              <input {...register('xId', { required: true })} className="input-horror" placeholder="@horror_taro" />
            </div>
          </div>
          <div>
            <label className="label-horror">ジャンル</label>
            <input {...register('genre')} className="input-horror" placeholder="心霊、都市伝説…" />
          </div>
          <div>
            <label className="label-horror">参考にする理由</label>
            <input {...register('reason')} className="input-horror" placeholder="バズり方が参考になる…" />
          </div>
          <div>
            <label className="label-horror">メモ</label>
            <input {...register('memo')} className="input-horror" placeholder="気づき…" />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-red">
            {loading ? '保存中…' : '保存'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {accounts.map(acc => (
          <div key={acc.id} className={`card cursor-pointer transition-colors ${selected?.id === acc.id ? 'border-red-700' : 'hover:border-gray-600'}`}>
            <div
              className="flex items-start justify-between"
              onClick={() => setSelected(selected?.id === acc.id ? null : acc)}
            >
              <div>
                <p className="font-medium text-gray-200">{acc.name}</p>
                <p className="text-xs text-gray-500">{acc.xId} {acc.genre && `/ ${acc.genre}`}</p>
                <p className="text-xs text-gray-600 mt-1">{acc.posts.length}件の参考投稿</p>
              </div>
              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => makePreset(acc)}
                  className="text-xs px-2 py-1 border border-horror-border text-gray-400 hover:border-yellow-700 hover:text-yellow-400 rounded"
                >
                  プリセット化
                </button>
                <button
                  onClick={() => deleteAccount(acc.id)}
                  className="text-xs px-2 py-1 border border-horror-border text-gray-500 hover:border-red-700 hover:text-red-400 rounded"
                >
                  削除
                </button>
              </div>
            </div>

            {selected?.id === acc.id && (
              <div className="mt-3 pt-3 border-t border-horror-border space-y-3">
                {acc.reason && <p className="text-xs text-gray-400">参考理由: {acc.reason}</p>}
                {acc.memo && <p className="text-xs text-gray-400">メモ: {acc.memo}</p>}

                <div>
                  <p className="text-xs text-gray-500 mb-2">参考投稿を追加</p>
                  <textarea
                    value={postText}
                    onChange={e => setPostText(e.target.value)}
                    placeholder="参考にしたい投稿文を貼り付け…"
                    className="input-horror text-sm"
                    rows={3}
                  />
                  <button
                    onClick={() => addPost(acc.id)}
                    className="mt-2 text-sm px-4 py-1.5 bg-red-900 hover:bg-red-800 text-white rounded"
                  >
                    追加・分析
                  </button>
                </div>

                {analysis && (
                  <div className="card bg-[#0d0d0d]">
                    <p className="text-xs text-red-400 mb-1">文体分析</p>
                    <p className="text-xs text-gray-300">{analysis.summary}</p>
                    {analysis.avgCharCount && <p className="text-xs text-gray-500 mt-1">平均 {analysis.avgCharCount}字 / 問いかけ {analysis.questionFreq}</p>}
                  </div>
                )}

                {acc.posts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">保存済み投稿 ({acc.posts.length})</p>
                    {acc.posts.map(p => (
                      <div key={p.id} className="bg-[#0d0d0d] rounded p-2 flex items-start justify-between gap-2">
                        <p className="text-xs text-gray-300 flex-1 line-clamp-2">{p.text}</p>
                        <button
                          onClick={() => deletePost(acc.id, p.id)}
                          className="text-xs text-gray-600 hover:text-red-400 shrink-0"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <p className="text-center text-gray-600 py-8">参考アカウントを追加してください。</p>
      )}
    </div>
  )
}
