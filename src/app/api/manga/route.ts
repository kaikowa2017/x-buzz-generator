import { NextRequest, NextResponse } from 'next/server'
import { generateManga } from '@/lib/generator'

export async function POST(req: NextRequest) {
  try {
    const { keyword, panelCount, mangaType, hasNarration, punchlineStrength, dialogueLevel } = await req.json()
    const data = generateManga(
      keyword || '',
      Number(panelCount) || 4,
      mangaType || '意味怖漫画',
      hasNarration !== false,
      punchlineStrength || '強',
      dialogueLevel || '普通',
    )
    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
