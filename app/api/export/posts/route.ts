import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const posts = await prisma.buzzPost.findMany({
      include: {
        account: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const header = [
      "id",
      "account",
      "url",
      "content",
      "likes",
      "reposts",
      "replies",
      "views",
      "createdAt",
    ];

    const rows = posts.map((p: any) => {
      const m = p.metrics?.[0] ?? {};

      return [
        p.id ?? "",
        p.account?.name ?? "",
        p.url ?? "",
        (p.content ?? "").replace(/\n/g, " "),
        m.likes ?? 0,
        m.reposts ?? 0,
        m.replies ?? 0,
        m.views ?? 0,
        p.createdAt ?? "",
      ];
    });

    const csv = [header, ...rows]
      .map((row) =>
        row
      .map((cell: unknown) => `"${String(cell).replace(/"/g, '""')}"`)          .join(",")
      )
      .join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=posts.csv",
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