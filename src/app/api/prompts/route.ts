import { NextRequest, NextResponse } from 'next/server'
import { generateImagePrompts, generateVideoPrompts } from '@/lib/generator'

export async function POST(req: NextRequest) {
  try {
    const { keyword, imageCount, imageType, imageTools, videoTools } = await req.json()
    const images = generateImagePrompts(
      keyword || '',
      Number(imageCount) || 2,
      imageType || '2枚構成',
      imageTools || ['Midjourney', 'Stable Diffusion', 'DALL·E', 'Grok', 'GPT'],
    )
    const videos = generateVideoPrompts(
      keyword || '',
      videoTools || ['Runway', 'Pika', 'Grok', 'GPT'],
    )
    return NextResponse.json({ success: true, data: { images, videos } })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
