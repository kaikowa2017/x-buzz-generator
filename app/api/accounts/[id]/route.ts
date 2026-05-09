export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const account = await prisma.account.update({
    where: { id },
    data: {
      name: body.name,
      handle: body.handle,
      bio: body.bio,
      style: body.style,
      isActive: body.isActive,
    },
  });

  return NextResponse.json(account);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.account.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}