import { NextRequest, NextResponse } from 'next/server'
import { generateAllFromPost } from '@/lib/generator'
import { prisma } from '@/lib/prisma'
import { OWNER_ID } from '@/lib/auth'
import type { PostInput } from '@/lib/generator'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input: PostInput = body

    let patterns: { type: string; value: string; weight: number }[] = []
    if (input.usePatterns) {
      patterns = await prisma.pattern.findMany({
        where: { userId: OWNER_ID },
        orderBy: { weight: 'desc' },
        take: 10,
      })
    }

    const result = generateAllFromPost(input, patterns)
    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
