import { NextResponse } from "next/server";
import { generatePost } from "@/lib/generator";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { theme, genreId, accountId, mood, length } = body;

    if (!theme) {
      return NextResponse.json({ error: "theme は必須です" }, { status: 400 });
    }

    let genreName = "knowledge";
    let examples: string[] = [];
    let patterns: { pattern: string; weight: number }[] = [];
    let accountStyle = "";
    let accountBio = "";

    if (genreId) {
      const genre = await prisma.genre.findUnique({
        where: { id: genreId },
      });

      if (genre) {
        genreName = genre.name;

        if (genre.examples) {
          try {
            examples = JSON.parse(genre.examples);
          } catch {
            examples = [genre.examples];
          }
        }
      }
    }

    if (accountId) {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        include: {
          patterns: {
            orderBy: { weight: "desc" },
            take: 10,
          },
          ngWords: true,
        },
      });

      if (account) {
        accountStyle = account.style ?? "";
        accountBio = account.bio ?? "";

        patterns = account.patterns.map((p) => ({
          pattern: p.pattern,
          weight: p.weight,
        }));

        const ngWords = account.ngWords.map((n) => n.word);
        if (ngWords.length) {
          patterns.push({
            pattern: `NGワード禁止: ${ngWords.join("、")}`,
            weight: 2,
          });
        }
      }
    }

    const results = generatePost({
      theme,
      genre: genreName,
      mood,
      length,
      patterns,
      examples: [
        ...examples,
        accountBio ? `アカウント方針: ${accountBio}` : "",
        accountStyle ? `文体: ${accountStyle}` : "",
      ].filter(Boolean),
      style: accountStyle,
    });

    return NextResponse.json(results);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "予期しないエラーが発生しました";

    console.error("[/api/generate]", err);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}