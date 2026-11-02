import { NextResponse } from "next/server";

import { jsonErrorResponse } from "@/lib/http-errors";
import { previewRentabilidadForBanquero, settleRentabilidadForBanquero } from "@/lib/rentabilidad";

export async function GET(request: Request) {
  try {
    const period = new URL(request.url).searchParams.get("period") ?? undefined;
    const preview = await previewRentabilidadForBanquero(period || undefined);
    return NextResponse.json({ ok: true, rentabilidad: preview });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const json = (await request.json().catch(() => null)) as {
      childId?: string;
      periodKey?: string;
      discretionaryMinor?: number;
    } | null;
    const childId = typeof json?.childId === "string" ? json.childId : "";
    const periodKey = typeof json?.periodKey === "string" ? json.periodKey : "";
    if (!childId) return NextResponse.json({ error: "Elige al niño." }, { status: 400 });
    if (!periodKey) return NextResponse.json({ error: "Elige el mes." }, { status: 400 });
    const result = await settleRentabilidadForBanquero({
      childId,
      periodKey,
      discretionaryMinor: json?.discretionaryMinor ?? 0,
    });
    return NextResponse.json({ ok: true, rentabilidad: result }, { status: 201 });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
