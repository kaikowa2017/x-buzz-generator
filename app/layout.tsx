import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { AccountProvider } from "@/contexts/AccountContext";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "X投稿マネージャー",
  description: "X投稿の生成・分析・最適化ツール",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geist.variable} h-full`}>
      <body className="h-full flex bg-zinc-950 text-zinc-100 font-sans antialiased">
        <AccountProvider>
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto p-6">{children}</div>
          </main>
        </AccountProvider>
      </body>
    </html>
  );
}
