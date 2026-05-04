import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OWNER_ID } from '@/lib/auth'

export async function GET() {
  try {
    const presets = await prisma.stylePreset.findMany({
      where: { userId: OWNER_ID },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: presets })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, sourceType, sourceId, features } = body
    if (!name) return NextResponse.json({ success: false, error: 'name required' }, { status: 400 })
    const preset = await prisma.stylePreset.create({
      data: {
        userId: OWNER_ID,
        name,
        description: description || '',
        sourceType: sourceType || 'manual',
        sourceId: sourceId || '',
        features: typeof features === 'string' ? features : JSON.stringify(features || {}),
      },
    })
    return NextResponse.json({ success: true, data: preset })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
