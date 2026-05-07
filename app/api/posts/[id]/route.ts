import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      account: true,
      genre: true,
      metrics: { orderBy: { recordedAt: "desc" } },
    },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(post);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const post = await prisma.post.update({
    where: { id },
    data: {
      content:      body.content,
      imagePrompt:  body.imagePrompt,
      videoPrompt:  body.videoPrompt,
      status:       body.status,
      score:        body.score,
      isTemplate:   body.isTemplate,
      templateTitle: body.templateTitle,
      postedAt:     body.status === "posted" ? new Date() : undefined,
    },
  });
  return NextResponse.json(post);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
