import { NextResponse } from "next/server";

import { formatClerkError } from "@/lib/clerk-users";
import { creditRentabilidadForBanquero } from "@/lib/money";

export async function POST(request: Request) {
  try {
    const json = (await request.json().catch(() => null)) as { childId?: string; amountMinor?: number; note?: string } | null;
    const childId = typeof json?.childId === "string" ? json.childId : "";
    if (!childId) return NextResponse.json({ error: "Elige al niño." }, { status: 400 });
    const result = await creditRentabilidadForBanquero(childId, json);
    return NextResponse.json({ ok: true, rentabilidad: result }, { status: 201 });
  } catch (error) {
    const message = formatClerkError(error);
    const status = message === "No autorizado." ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
