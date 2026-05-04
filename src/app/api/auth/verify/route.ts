import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    const APP_PASSWORD = process.env.APP_PASSWORD
    const isProd = process.env.NODE_ENV === 'production'

    // 本番で未設定 → 完全ブロック
    if (!APP_PASSWORD && isProd) {
      return NextResponse.json(
        { ok: false, error: 'APP_PASSWORD が設定されていません。Vercel の環境変数を確認してください。' },
        { status: 403 },
      )
    }

    // 開発環境で未設定 → バイパス（警告付き）
    if (!APP_PASSWORD) {
      return NextResponse.json({ ok: true, dev: true, warning: 'APP_PASSWORD 未設定（開発モード）' })
    }

    if (password === APP_PASSWORD) {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false, error: 'パスワードが違います' })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

// パスワード設定状況を返す（クライアント初回チェック用）
export async function GET() {
  const APP_PASSWORD = process.env.APP_PASSWORD
  const isProd = process.env.NODE_ENV === 'production'
  return NextResponse.json({
    required: !!(APP_PASSWORD || isProd),
    devBypass: !APP_PASSWORD && !isProd,
  })
}
