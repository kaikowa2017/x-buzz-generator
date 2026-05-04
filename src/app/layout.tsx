import type { Metadata } from 'next'
import './globals.css'
import { Sidebar, BottomNav } from '@/components/layout/BottomNav'
import { PasswordGate } from '@/components/auth/PasswordGate'

export const metadata: Metadata = {
  title: 'ホラーX編集長AI',
  description: 'X向けホラー投稿を生成するプライベートツール',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-[#0a0a0a] text-[#f0f0f0]">
        <PasswordGate>
          <Sidebar />
          <main className="md:ml-56 min-h-screen pb-20 md:pb-0">
            {children}
          </main>
          <BottomNav />
        </PasswordGate>
      </body>
    </html>
  )
}
