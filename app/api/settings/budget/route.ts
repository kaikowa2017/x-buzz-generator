import { NextResponse } from "next/server";
import { getBudgetStatus, setDailyBudget, resetTodayUsage } from "@/lib/budget";

export async function GET() {
  try {
    const status = await getBudgetStatus();
    return NextResponse.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { budgetJpy } = body as { budgetJpy?: number };

    if (budgetJpy === undefined || isNaN(budgetJpy) || budgetJpy < 0) {
      return NextResponse.json({ error: "budgetJpy は 0 以上の数値を指定してください" }, { status: 400 });
    }

    await setDailyBudget(Math.floor(budgetJpy));
    return NextResponse.json({ ok: true, budgetJpy: Math.floor(budgetJpy) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "保存に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await resetTodayUsage();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "リセットに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
