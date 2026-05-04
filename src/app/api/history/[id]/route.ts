import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OWNER_ID } from '@/lib/auth'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.history.deleteMany({ where: { id, userId: OWNER_ID } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
