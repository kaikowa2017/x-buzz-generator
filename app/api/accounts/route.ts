import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "asc" },
    include: { genres: { include: { genre: true } } },
  });
  return NextResponse.json(accounts);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, handle, bio, style } = body;
  if (!name || !handle) return NextResponse.json({ error: "name と handle は必須です" }, { status: 400 });

  const account = await prisma.account.create({ data: { name, handle, bio, style } });
  return NextResponse.json(account, { status: 201 });
}
