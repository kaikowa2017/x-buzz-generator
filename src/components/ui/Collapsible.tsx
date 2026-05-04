'use client'

import { useState } from 'react'

interface Props {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export function Collapsible({ title, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-horror-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#1a1a1a] text-sm text-gray-300 hover:bg-[#222] transition-colors"
      >
        <span>{title}</span>
        <span className="text-gray-500">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="p-4 bg-[#141414] border-t border-horror-border">
          {children}
        </div>
      )}
    </div>
  )
}
