import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const account = await prisma.account.findFirst({
    where: { isActive: true },
    select: { id: true, name: true, handle: true, bio: true, style: true },
  });
  if (!account) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(account);
}
