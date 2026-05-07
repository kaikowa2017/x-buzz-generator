import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, handle, bio, style, isActive } = body;

  if (isActive === true) {
    await prisma.account.updateMany({ data: { isActive: false } });
  }

  const account = await prisma.account.update({
    where: { id },
    data: { name, handle, bio, style, isActive },
  });
  return NextResponse.json(account);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
