import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { maskApiKey } from "@/lib/claude";

export async function GET() {
  const config = await prisma.appConfig.findUnique({
    where: { key: "anthropic_api_key" },
  });

  const dbKey  = config?.value ?? "";
  const envKey = process.env.ANTHROPIC_API_KEY ?? "";

  const activeKey = dbKey || envKey;
  const source: "db" | "env" | "none" =
    dbKey ? "db" : envKey ? "env" : "none";

  return NextResponse.json({
    hasKey:    !!activeKey,
    source,
    maskedKey: activeKey ? maskApiKey(activeKey) : null,
  });
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { apiKey } = body as { apiKey?: string };

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json({ error: "APIキーを入力してください" }, { status: 400 });
    }
    if (!apiKey.startsWith("sk-")) {
      return NextResponse.json({ error: "APIキーの形式が正しくありません（sk- で始まる必要があります）" }, { status: 400 });
    }

    await prisma.appConfig.upsert({
      where:  { key: "anthropic_api_key" },
      create: { key: "anthropic_api_key", value: apiKey.trim() },
      update: { value: apiKey.trim() },
    });

    return NextResponse.json({ ok: true, maskedKey: maskApiKey(apiKey.trim()) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "保存に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.appConfig.deleteMany({ where: { key: "anthropic_api_key" } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
