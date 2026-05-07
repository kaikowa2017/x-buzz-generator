import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

/**
 * DB保存キー → .env キーの順で優先してAnthropicクライアントを返す。
 * どちらも未設定の場合はエラーをスロー。
 */
export async function getAnthropicClient(): Promise<Anthropic> {
  let apiKey = process.env.ANTHROPIC_API_KEY ?? "";

  try {
    const config = await prisma.appConfig.findUnique({
      where: { key: "anthropic_api_key" },
    });
    if (config?.value) apiKey = config.value; // DB設定がある場合は優先
  } catch {
    // DB接続エラー時は .env にフォールバック
  }

  if (!apiKey) {
    throw new Error(
      "Claude APIキーが設定されていません。設定ページから入力してください。"
    );
  }

  return new Anthropic({ apiKey });
}

/** APIキーがマスクされた文字列を返す（表示用）*/
export function maskApiKey(key: string): string {
  if (key.length <= 8) return "sk-****";
  return key.slice(0, 10) + "..." + key.slice(-4);
}
