'use client'

import { useState } from 'react'
import { CopyButton } from './CopyButton'
import type { OddityIdea } from '@/lib/generator'

interface Props {
  oddities: OddityIdea[]
}

export function OddityIdeas({ oddities }: Props) {
  const [active, setActive] = useState(0)
  const current = oddities[active]

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">違和感案 — 画像・漫画に流用可</p>

      {/* pill tabs */}
      <div className="flex gap-1 flex-wrap">
        {oddities.map((o, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${
              active === i
                ? 'border-red-600 bg-red-950/40 text-red-300'
                : 'border-horror-border text-gray-500 hover:border-gray-600 hover:text-gray-300'
            }`}
          >
            {i + 1}. {o.short}
          </button>
        ))}
      </div>

      {/* detail */}
      {current && (
        <div className="bg-[#0d0d0d] rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-300 font-medium">{current.short}</p>
            <CopyButton text={current.short} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-gray-600 mb-1">🎨 画像</p>
              <p className="text-gray-300 leading-relaxed">{current.imageNote}</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">📚 漫画</p>
              <p className="text-gray-300 leading-relaxed">{current.mangaNote}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
