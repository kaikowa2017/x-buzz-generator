import { NextResponse } from "next/server";
import { generatePost } from "@/lib/generator";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { theme, genreId, accountId, mood, length } = body;
    if (!theme) return NextResponse.json({ error: "theme は必須です" }, { status: 400 });

    let genreName = "knowledge";
    let patterns: { pattern: string; weight: number }[] = [];
    let examples: string[] = [];

    if (genreId) {
      const genre = await prisma.genre.findUnique({ where: { id: genreId } });
      if (genre) {
        genreName = genre.name;
        if (genre.examples) {
          try { examples = JSON.parse(genre.examples); } catch {}
        }
      }
    }

    if (accountId) {
      const dbPatterns = await prisma.learningPattern.findMany({
        where: { accountId },
        orderBy: { weight: "desc" },
        take: 10,
      });
      patterns = dbPatterns.map((p: any) => ({ pattern: p.pattern, weight: p.weight }));
    }

    const results = generatePost({ theme, genre: genreName, mood, length, patterns, examples });
    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "予期しないエラーが発生しました";
    console.error("[/api/generate]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
