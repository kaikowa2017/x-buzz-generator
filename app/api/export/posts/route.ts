import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function csv(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId") || undefined;

  const posts = await prisma.post.findMany({
    where: accountId ? { accountId } : {},
    include: {
      account: { select: { name: true, handle: true } },
      genre:   { select: { name: true } },
      metrics: { orderBy: { recordedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const header = [
    "ID", "アカウント", "ハンドル", "ジャンル", "投稿タイプ", "ステータス",
    "テンプレート", "内容",
    "いいね", "コメント", "インプレッション", "エンゲージメント率",
    "作成日", "投稿日",
  ].join(",");

  const rows = posts.map((p) => {
    const m = p.metrics[0];
    return [
      p.id,
      p.account.name,
      p.account.handle,
      p.genre?.name ?? "",
      p.postType ?? "",
      p.status,
      p.isTemplate ? "1" : "0",
      p.content,
      m?.likes ?? "",
      m?.replies ?? "",
      m?.impressions ?? "",
      m?.engagementRate != null ? m.engagementRate.toFixed(2) : "",
      new Date(p.createdAt).toLocaleDateString("ja-JP"),
      p.postedAt ? new Date(p.postedAt).toLocaleDateString("ja-JP") : "",
    ].map(csv).join(",");
  });

  const body = "﻿" + [header, ...rows].join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="posts_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
