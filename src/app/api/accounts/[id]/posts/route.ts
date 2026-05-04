import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeStyle } from '@/lib/generator'
import { OWNER_ID } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: accountId } = await params
    const { text } = await req.json()
    if (!text) return NextResponse.json({ success: false, error: 'text required' }, { status: 400 })
    // verify ownership
    const account = await prisma.referenceAccount.findFirst({ where: { id: accountId, userId: OWNER_ID } })
    if (!account) return NextResponse.json({ success: false, error: 'not found' }, { status: 404 })
    const post = await prisma.referencePost.create({ data: { userId: OWNER_ID, accountId, text } })
    return NextResponse.json({ success: true, data: post })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: accountId } = await params
    const posts = await prisma.referencePost.findMany({
      where: { accountId, userId: OWNER_ID },
      orderBy: { createdAt: 'desc' },
    })
    const analysis = analyzeStyle(posts.map(p => p.text))
    return NextResponse.json({ success: true, data: { posts, analysis } })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await params
    const { postId } = await req.json()
    await prisma.referencePost.deleteMany({ where: { id: postId, userId: OWNER_ID } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
