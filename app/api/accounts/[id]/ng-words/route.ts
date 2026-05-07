import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const words = await prisma.accountNGWord.findMany({
    where:   { accountId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(words);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body   = await req.json().catch(() => ({}));
  const { word } = body as { word?: string };

  if (!word?.trim()) return NextResponse.json({ error: "word は必須" }, { status: 400 });

  const exists = await prisma.accountNGWord.findFirst({ where: { accountId: id, word: word.trim() } });
  if (exists)   return NextResponse.json({ error: "すでに登録済みです" }, { status: 409 });

  const created = await prisma.accountNGWord.create({ data: { accountId: id, word: word.trim() } });
  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id }  = await params;
  const body    = await req.json().catch(() => ({}));
  const { wordId } = body as { wordId?: string };

  if (!wordId) return NextResponse.json({ error: "wordId は必須" }, { status: 400 });

  await prisma.accountNGWord.deleteMany({ where: { id: wordId, accountId: id } });
  return NextResponse.json({ ok: true });
}
