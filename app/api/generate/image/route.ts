import { NextResponse } from "next/server";
import { generateImagePrompts } from "@/lib/image-generator";

export async function POST(req: Request) {
  const body = await req.json();
  const { subject, genre, style, mood, aspectRatio, imageType, panelCount, presetId } = body;
  if (!subject) return NextResponse.json({ error: "subject は必須です" }, { status: 400 });

  const prompts = generateImagePrompts({
    subject,
    genre: genre ?? "knowledge",
    style,
    mood,
    aspectRatio,
    imageType,
    panelCount: panelCount ? Number(panelCount) as 1|2|3|4|5 : undefined,
    presetId,
  });
  return NextResponse.json(prompts);
}
