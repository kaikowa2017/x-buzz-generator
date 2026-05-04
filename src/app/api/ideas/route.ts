import { NextRequest, NextResponse } from 'next/server'
import { generateIdeas } from '@/lib/generator'

export async function POST(req: NextRequest) {
  try {
    const { keyword, genre } = await req.json()
    const data = generateIdeas(keyword || '', genre || '')
    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
