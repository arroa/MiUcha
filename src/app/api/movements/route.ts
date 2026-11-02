import { NextResponse } from "next/server";

import { getChildSession } from "@/lib/child-account";
import { listChildMovements, recentMovementPeriods } from "@/lib/child-feed";
import { jsonErrorResponse } from "@/lib/http-errors";
import { periodKeyFromIso, santiagoToday } from "@/lib/santiago-date";

export async function GET(request: Request) {
  const child = await getChildSession();
  if (!child) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const period = new URL(request.url).searchParams.get("period");
  const periodKey = period?.trim() || periodKeyFromIso(santiagoToday().date);
  try {
    const movements = await listChildMovements(child, periodKey);
    return NextResponse.json({
      periodKey,
      periods: recentMovementPeriods(12),
      movements,
    });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
