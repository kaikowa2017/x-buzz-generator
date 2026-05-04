import { NextRequest, NextResponse } from 'next/server'
import { extractTemplate } from '@/lib/generator'
import { prisma } from '@/lib/prisma'
import { OWNER_ID } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { text, save } = await req.json()
    if (!text?.trim()) return NextResponse.json({ success: false, error: 'text required' }, { status: 400 })

    const result = extractTemplate(text)

    if (save) {
      const saved = await prisma.postTemplate.create({
        data: {
          userId: OWNER_ID,
          name: result.name,
          structure: JSON.stringify(result.structure),
          example: text,
          score: result.score,
          tags: JSON.stringify(result.structure.tags),
        },
      })
      return NextResponse.json({ success: true, data: { ...result, savedId: saved.id } })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
