import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeBuzzPost } from '@/lib/generator'
import { OWNER_ID } from '@/lib/auth'

function stableId(prefix: string, value: string): string {
  const hash = createHash('sha256').update(value).digest('hex').slice(0, 16)
  return `${prefix}_${hash}`
}

export async function GET() {
  try {
    const posts = await prisma.buzzPost.findMany({
      where: { userId: OWNER_ID },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: posts })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, likes, impressions, genre, memo } = body
    if (!text) return NextResponse.json({ success: false, error: 'text required' }, { status: 400 })

    const analysis = analyzeBuzzPost(text)

    const post = await prisma.buzzPost.create({
      data: {
        userId: OWNER_ID,
        text,
        likes: Number(likes) || 0,
        impressions: Number(impressions) || 0,
        genre: genre || '',
        memo: memo || '',
        hook: analysis.hook,
        charCount: analysis.charCount,
        lineBreakCount: analysis.lineBreakCount,
        hasQuestion: analysis.hasQuestion,
        onomatopoeiaCount: analysis.onomatopoeiaCount,
        emotionWords: JSON.stringify(analysis.emotionWords),
        hasCommentPrompt: analysis.hasCommentPrompt,
        hasFollowPrompt: analysis.hasFollowPrompt,
        styleSummary: analysis.styleSummary,
      },
    })

    await updatePatterns(post.likes, post.impressions, text)

    return NextResponse.json({ success: true, data: post })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

async function updatePatterns(likes: number, impressions: number, text: string) {
  const weight = Math.log10(Math.max(likes + impressions / 10, 1) + 1)
  const opener = text.split('\n')[0].slice(0, 30)
  const closer = (text.split('\n').pop() ?? '').slice(-30)

  if (opener) {
    const id = stableId('opener', opener)
    await prisma.pattern.upsert({
      where: { id },
      update: { weight: { increment: weight }, count: { increment: 1 } },
      create: { id, userId: OWNER_ID, name: opener, type: 'opener', value: opener, weight },
    })
  }
  if (closer) {
    const id = stableId('closer', closer)
    await prisma.pattern.upsert({
      where: { id },
      update: { weight: { increment: weight }, count: { increment: 1 } },
      create: { id, userId: OWNER_ID, name: closer, type: 'closer', value: closer, weight },
    })
  }
}
