import { NextResponse } from "next/server";

import { getChildSession } from "@/lib/child-account";
import { listChildMovements, recentMovementPeriods } from "@/lib/child-feed";
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron cargar los movimientos." },
      { status: 400 },
    );
  }
}
