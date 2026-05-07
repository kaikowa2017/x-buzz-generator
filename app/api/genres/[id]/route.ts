import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const genre = await prisma.genre.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      rules: body.rules ? JSON.stringify(body.rules) : undefined,
      examples: body.examples ? JSON.stringify(body.examples) : undefined,
    },
  });
  return NextResponse.json(genre);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.genre.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
