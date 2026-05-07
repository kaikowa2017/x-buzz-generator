import { NextResponse } from "next/server";
import { generateVideoPrompts } from "@/lib/video-generator";

export async function POST(req: Request) {
  const body = await req.json();
  const { subject, genre, style, mood, duration, motion } = body;
  if (!subject) return NextResponse.json({ error: "subject は必須です" }, { status: 400 });

  const prompts = generateVideoPrompts({ subject, genre: genre ?? "knowledge", style, mood, duration, motion });
  return NextResponse.json(prompts);
}
