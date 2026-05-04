'use client'

import { useState } from 'react'

interface Props {
  type: string
  title: string
  input: unknown
  output: unknown
  className?: string
}

export function SaveButton({ type, title, input, output, className = '' }: Props) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title, input, output }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      className={`text-xs px-3 py-1.5 rounded border transition-all ${
        saved
          ? 'border-blue-600 text-blue-400 bg-blue-900/20'
          : 'border-horror-border text-horror-muted hover:border-blue-500 hover:text-blue-400'
      } ${className}`}
    >
      {saving ? '保存中…' : saved ? '✓ 保存済み' : '履歴に保存'}
    </button>
  )
}
