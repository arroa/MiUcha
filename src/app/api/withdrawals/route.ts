import { NextResponse } from "next/server";

import { getChildSession } from "@/lib/child-account";
import { formatClerkError } from "@/lib/clerk-users";
import {
  historyWithdrawalsForAdult,
  listChildWithdrawals,
  pendingWithdrawalsForAdult,
  requestWithdrawal,
} from "@/lib/money";

export async function GET(request: Request) {
  try {
    const queue = new URL(request.url).searchParams.get("queue");
    const child = await getChildSession();
    if (child) {
      const withdrawals = await listChildWithdrawals(child);
      return NextResponse.json({ withdrawals });
    }

    if (queue === "history") {
      const data = await historyWithdrawalsForAdult();
      if (!data) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
      return NextResponse.json(data);
    }

    const data = await pendingWithdrawalsForAdult();
    if (!data) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: formatClerkError(error) }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const child = await getChildSession();
  if (!child) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const withdrawal = await requestWithdrawal(child, await request.json().catch(() => null));
    return NextResponse.json({ ok: true, withdrawal }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: formatClerkError(error) }, { status: 400 });
  }
}
