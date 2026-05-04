import { NextRequest, NextResponse } from 'next/server'
import { analyzeFeedback } from '@/lib/generator'

export async function POST(req: NextRequest) {
  try {
    const { text, likes, impressions } = await req.json()
    if (!text?.trim()) return NextResponse.json({ success: false, error: 'text required' }, { status: 400 })
    return NextResponse.json({
      success: true,
      data: analyzeFeedback(text, Number(likes) || 0, Number(impressions) || 0),
    })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
