import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/claude";
import { checkBudget, addUsage } from "@/lib/budget";
import { HORROR_SYSTEM, validatePost, makeSuggestions } from "@/app/api/generate/horror/route";

const APPLY_SYSTEM = `あなたはXホラー投稿の軽量チューニングAIです。
指摘された問題点を最小限の変更（20〜30%以内）で修正してください。

ルール:
- 元の構造・ネタ・世界観を保つ
- ホラーの5段階構造を維持する
- 違和感は減らさない（増やす方向のみ）
- 結論・説明を追加しない
- 修正後の投稿文のみ返す（説明不要）`;

const REGEN_SYSTEM = HORROR_SYSTEM;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { content, instruction, genre, postType, mode = "apply" } = body as {
      content:     string;
      instruction?: string;
      genre?:      string;
      postType?:   string;
      mode?:       "apply" | "regen";
    };

    if (!content && mode === "apply") {
      return NextResponse.json({ error: "content は必須" }, { status: 400 });
    }

    const budgetCheck = await checkBudget();
    if (!budgetCheck.ok) {
      return NextResponse.json({ error: budgetCheck.message, overBudget: true }, { status: 429 });
    }

    const anthropic = await getAnthropicClient();

    let appliedContent = content;

    if (mode === "regen") {
      /* 単投稿再生成 */
      const prompt = [
        `ジャンル: ${genre ?? "ホラー"}`,
        `投稿タイプ: ${postType ?? "刺さる"}`,
        "以下の条件で新しいホラー投稿を1案生成してください。JSON不要・投稿文のみ返す。",
        "違和感を最低2〜3個入れ、結論を書かず、余韻で終わること。",
      ].join("\n");

      const response = await anthropic.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 600,
        system: [{ type: "text", text: REGEN_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("").trim();

      if (text) appliedContent = text;
      await addUsage(response.usage.input_tokens, response.usage.output_tokens);

    } else {
      /* 改善案を適用 */
      const prompt = [
        `元の投稿文:`,
        content,
        ``,
        `修正指示:`,
        instruction ?? "",
        ``,
        `上記の指示だけを適用した修正後の投稿文のみを返してください（説明・コードブロック不要）。`,
      ].join("\n");

      const response = await anthropic.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 500,
        system: [{ type: "text", text: APPLY_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("").trim();

      if (text) appliedContent = text;
      await addUsage(response.usage.input_tokens, response.usage.output_tokens);
    }

    /* 適用後のスコアを検証 */
    const validation = validatePost(appliedContent);
    const suggestions = validation.tier !== "good"
      ? makeSuggestions(validation.scores, validation.failedChecks)
      : [];

    return NextResponse.json({
      appliedContent,
      horrorTier:         validation.tier,
      horrorPassed:       validation.passed,
      horrorOverall:      validation.overall,
      horrorFailedChecks: validation.failedChecks,
      horrorScores:       validation.scores,
      horrorSuggestions:  suggestions,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "チューニング中にエラー";
    console.error("[/api/generate/horror/apply]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
