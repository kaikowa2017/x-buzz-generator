import { NextRequest, NextResponse } from 'next/server'
import { scorePost } from '@/lib/generator'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text?.trim()) return NextResponse.json({ success: false, error: 'text required' }, { status: 400 })
    return NextResponse.json({ success: true, data: scorePost(text) })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
