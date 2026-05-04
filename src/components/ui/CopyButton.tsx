'use client'

import { useState } from 'react'

interface Props {
  text: string
  className?: string
  label?: string
}

export function CopyButton({ text, className = '', label = 'コピー' }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`text-xs px-3 py-1.5 rounded border transition-all ${
        copied
          ? 'border-green-600 text-green-400 bg-green-900/20'
          : 'border-horror-border text-horror-muted hover:border-red-500 hover:text-red-400'
      } ${className}`}
    >
      {copied ? '✓ コピー済み' : label}
    </button>
  )
}
