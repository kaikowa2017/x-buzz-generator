import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OWNER_ID } from '@/lib/auth'

export async function GET() {
  try {
    const templates = await prisma.postTemplate.findMany({
      where: { userId: OWNER_ID },
      orderBy: { score: 'desc' },
    })
    return NextResponse.json({ success: true, data: templates })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
