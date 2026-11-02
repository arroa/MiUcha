import { NextResponse } from "next/server";

import { getChildSession } from "@/lib/child-account";
import { jsonErrorResponse } from "@/lib/http-errors";
import {
  historyDepositsForAdult,
  listChildDeposits,
  pendingDepositsForAdult,
  requestDeposit,
} from "@/lib/money";

export async function GET(request: Request) {
  try {
    const queue = new URL(request.url).searchParams.get("queue");
    const child = await getChildSession();
    if (child) {
      const deposits = await listChildDeposits(child);
      return NextResponse.json({ deposits });
    }

    if (queue === "history") {
      const data = await historyDepositsForAdult();
      if (!data) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
      return NextResponse.json(data);
    }

    const data = await pendingDepositsForAdult();
    if (!data) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    return NextResponse.json(data);
  } catch (error) {
    return jsonErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const child = await getChildSession();
  if (!child) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const deposit = await requestDeposit(child, await request.json().catch(() => null));
    return NextResponse.json({ ok: true, deposit }, { status: 201 });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
