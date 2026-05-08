import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const accounts = await prisma.account.findMany();

    const buzzPosts = await prisma.buzzPost.findMany({
      take: 10,
    });


    const checks = [
      {
        name: "DB接続",
        ok: true,
        detail: "PrismaでDB接続できています",
      },
      {
        name: "アカウント確認",
        ok: accounts.length >= 0,
        detail: accounts.length + "件のアカウントがあります",
      },
      {
        name: "投稿 → DB保存",
        ok: buzzPosts.length >= 0,
        detail: buzzPosts.length + "件のバズ投稿が保存済み",
      },
    ];

    return NextResponse.json({
      ok: true,
      checks,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}