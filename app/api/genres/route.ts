import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const genres = await prisma.genre.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(genres);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, description, rules, examples } = body;
  if (!name) return NextResponse.json({ error: "name は必須です" }, { status: 400 });

  const genre = await prisma.genre.create({
    data: {
      name,
      description,
      rules: rules ? JSON.stringify(rules) : null,
      examples: examples ? JSON.stringify(examples) : null,
    },
  });
  return NextResponse.json(genre, { status: 201 });
}
