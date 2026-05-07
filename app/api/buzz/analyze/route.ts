import { NextResponse } from "next/server";
import { analyzeBuzzUrl, analyzeManualBuzz } from "@/lib/buzz-fetcher";

export async function POST(req: Request) {
  const body = await req.json();
  const { url, content } = body;

  if (url) {
    const result = await analyzeBuzzUrl(url);
    return NextResponse.json(result);
  } else if (content) {
    const result = analyzeManualBuzz(content);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "url または content が必要です" }, { status: 400 });
}
