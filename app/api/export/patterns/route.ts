import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function csv(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId") || undefined;

  const patterns = await prisma.learningPattern.findMany({
    where: accountId ? { accountId } : {},
    include: { account: { select: { name: true } } },
    orderBy: { weight: "desc" },
  });

  const header = [
    "パターン", "重み", "強Count", "弱Count",
    "lifeScore", "trend", "source", "アカウント", "更新日",
  ].join(",");

  const rows = patterns.map((p) => [
    p.pattern,
    p.weight.toFixed(3),
    p.strongCount,
    p.weakCount,
    p.lifeScore.toFixed(2),
    p.trend,
    p.source,
    p.account?.name ?? "グローバル",
    new Date(p.updatedAt).toLocaleDateString("ja-JP"),
  ].map(csv).join(","));

  const body = "﻿" + [header, ...rows].join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="patterns_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
