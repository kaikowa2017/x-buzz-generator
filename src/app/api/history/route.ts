import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OWNER_ID } from '@/lib/auth'

export async function GET() {
  try {
    const items = await prisma.history.findMany({
      where: { userId: OWNER_ID },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json({ success: true, data: items })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, title, input, output } = body
    if (!type || !title) return NextResponse.json({ success: false, error: 'type and title required' }, { status: 400 })
    const item = await prisma.history.create({
      data: {
        userId: OWNER_ID,
        type,
        title,
        input: typeof input === 'string' ? input : JSON.stringify(input || {}),
        output: typeof output === 'string' ? output : JSON.stringify(output || {}),
      },
    })
    return NextResponse.json({ success: true, data: item })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
