'use client'

import { useState, useEffect, useCallback } from 'react'
import { AUTH_KEY, AUTH_VALUE } from '@/lib/auth'

interface Props {
  children: React.ReactNode
}

export function PasswordGate({ children }: Props) {
  const [status, setStatus] = useState<'loading' | 'locked' | 'unlocked'>('loading')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [devBypass, setDevBypass] = useState(false)

  const check = useCallback(() => {
    const stored = localStorage.getItem(AUTH_KEY)
    if (stored === AUTH_VALUE) {
      setStatus('unlocked')
    } else {
      setStatus('locked')
    }
  }, [])

  useEffect(() => {
    // サーバーにパスワード要否を確認
    fetch('/api/auth/verify')
      .then(r => r.json())
      .then(j => {
        if (j.devBypass) {
          // 開発環境でパスワード未設定 → 自動バイパス
          setDevBypass(true)
          localStorage.setItem(AUTH_KEY, AUTH_VALUE)
          setStatus('unlocked')
        } else if (!j.required) {
          setStatus('unlocked')
        } else {
          check()
        }
      })
      .catch(() => check())
  }, [check])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = await res.json()
      if (json.ok) {
        localStorage.setItem(AUTH_KEY, AUTH_VALUE)
        setStatus('unlocked')
        setPassword('')
      } else {
        setError(json.error || 'パスワードが違います')
      }
    } catch {
      setError('サーバーへの接続に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'locked') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <p className="text-red-700 text-lg tracking-widest mb-1">👁</p>
            <h1 className="text-2xl font-bold text-red-500" style={{ fontFamily: 'Georgia, serif' }}>
              ホラーX編集長AI
            </h1>
            <p className="text-gray-600 text-xs mt-2">プライベートアクセス</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="パスワードを入力"
                autoFocus
                className="w-full bg-[#141414] border border-[#2a2a2a] text-[#f0f0f0] rounded px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !password}
              className="w-full bg-red-700 hover:bg-red-600 disabled:bg-[#2a2a2a] disabled:text-gray-600 text-white font-bold py-3 rounded transition-colors"
            >
              {submitting ? '確認中…' : '入室'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // unlocked
  return (
    <>
      {devBypass && (
        <div className="bg-yellow-900/40 border-b border-yellow-700 px-4 py-1 text-xs text-yellow-400 text-center">
          ⚠ 開発モード: APP_PASSWORD 未設定（本番デプロイ前に必ず設定してください）
        </div>
      )}
      {children}
    </>
  )
}

// サイドバー・ナビから呼ぶロックボタン
export function LockButton({ className = '' }: { className?: string }) {
  const lock = () => {
    localStorage.removeItem(AUTH_KEY)
    window.location.reload()
  }
  return (
    <button
      onClick={lock}
      className={`text-xs text-gray-500 hover:text-red-400 transition-colors ${className}`}
      title="ロック（パスワード画面へ戻る）"
    >
      🔒 ロック
    </button>
  )
}
