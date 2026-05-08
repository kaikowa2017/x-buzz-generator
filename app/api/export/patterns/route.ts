import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const patterns = await prisma.learningPattern.findMany({
      include: {
        account: true,
      },
      orderBy: {
        weight: "desc",
      },
    });

    const header = [
      "pattern",
      "weight",
      "strongCount",
      "weakCount",
      "lifeScore",
      "trend",
      "source",
      "account",
    ];

    const rows = patterns.map((p: any) => [
      p.pattern ?? "",
      p.weight ?? 0,
      p.strongCount ?? 0,
      p.weakCount ?? 0,
      p.lifeScore ?? 0,
      p.trend ?? "",
      p.source ?? "",
      p.account?.name ?? "グローバル",
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map(String).join(","))
      .join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=patterns.csv",
      },
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