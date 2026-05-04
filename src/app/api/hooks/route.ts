import { NextRequest, NextResponse } from 'next/server'
import { generateHooks } from '@/lib/generator'

export async function POST(req: NextRequest) {
  try {
    const { keyword, postType } = await req.json()
    const data = generateHooks(keyword || '', postType || '')
    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
