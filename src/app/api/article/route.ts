import { NextRequest, NextResponse } from 'next/server'
import { generateArticle } from '@/lib/generator'
import type { StyleType } from '@/lib/generator'

export async function POST(req: NextRequest) {
  try {
    const { keyword, style } = await req.json()
    const data = generateArticle(keyword || '', (style as StyleType) || 'ぼそっと怖い')
    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
