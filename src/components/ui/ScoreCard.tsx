'use client'

import type { ScoreOutput } from '@/lib/generator'
import { SCORE_MAX, SCORE_LABELS } from '@/lib/generator'

interface Props {
  score: ScoreOutput
  compact?: boolean
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100)
  const color = pct >= 75 ? 'bg-green-600' : pct >= 45 ? 'bg-yellow-600' : 'bg-red-700'
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono text-gray-300">{value}<span className="text-gray-600">/{max}</span></span>
      </div>
      <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const GRADE_COLOR: Record<ScoreOutput['grade'], string> = {
  S: 'text-yellow-400', A: 'text-green-400', B: 'text-blue-400',
  C: 'text-orange-400', D: 'text-red-400',
}

export function ScoreCard({ score, compact = false }: Props) {
  return (
    <div className="space-y-3">
      {/* header */}
      <div className="flex items-center gap-4">
        <div className="text-center shrink-0">
          <p className={`text-4xl font-bold ${GRADE_COLOR[score.grade]}`}>{score.grade}</p>
          <p className="text-[10px] text-gray-600 mt-0.5">グレード</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-200">
            {score.total}<span className="text-sm text-gray-500">/100</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{score.verdict}</p>
        </div>
      </div>

      {/* breakdown bars */}
      <div className="space-y-2">
        {(Object.keys(SCORE_MAX) as (keyof typeof SCORE_MAX)[]).map(k => (
          <Bar key={k} label={SCORE_LABELS[k]} value={score.breakdown[k]} max={SCORE_MAX[k]} />
        ))}
      </div>

      {!compact && (
        <>
          {/* improvements */}
          <div className="space-y-1.5">
            <p className="text-xs text-gray-500">弱点 / 改善ポイント</p>
            {score.improvements.map((imp, i) => (
              <div key={i} className="flex gap-2 bg-[#0d0d0d] rounded p-2">
                <span className="text-red-500 text-xs shrink-0">#{i + 1}</span>
                <p className="text-xs text-gray-300">{imp}</p>
              </div>
            ))}
          </div>

          {/* revised */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5">修正版</p>
            <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed bg-[#0d0d0d] rounded p-3">
              {score.revised}
            </pre>
          </div>
        </>
      )}
    </div>
  )
}
