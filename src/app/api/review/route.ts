import { NextRequest, NextResponse } from 'next/server'
import { reviewPost, scorePost, generateOddityIdeas } from '@/lib/generator'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text) return NextResponse.json({ success: false, error: 'text required' }, { status: 400 })
    const review   = reviewPost(text)
    const score    = scorePost(text)
    const oddities = generateOddityIdeas(text)
    return NextResponse.json({ success: true, data: { review, score, oddities } })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
