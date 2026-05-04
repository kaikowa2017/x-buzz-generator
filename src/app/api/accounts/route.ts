import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OWNER_ID } from '@/lib/auth'

export async function GET() {
  try {
    const accounts = await prisma.referenceAccount.findMany({
      where: { userId: OWNER_ID },
      include: { posts: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: accounts })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, xId, genre, reason, memo } = body
    if (!name || !xId) return NextResponse.json({ success: false, error: 'name and xId required' }, { status: 400 })
    const account = await prisma.referenceAccount.create({
      data: { userId: OWNER_ID, name, xId, genre: genre || '', reason: reason || '', memo: memo || '' },
    })
    return NextResponse.json({ success: true, data: account })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
