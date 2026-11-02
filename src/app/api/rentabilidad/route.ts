import { NextResponse } from "next/server";

import { formatClerkError } from "@/lib/clerk-users";
import { previewRentabilidadForBanquero, settleRentabilidadForBanquero } from "@/lib/rentabilidad";

export async function GET(request: Request) {
  try {
    const period = new URL(request.url).searchParams.get("period") ?? undefined;
    const preview = await previewRentabilidadForBanquero(period || undefined);
    return NextResponse.json({ ok: true, rentabilidad: preview });
  } catch (error) {
    const message = formatClerkError(error);
    const status = message === "No autorizado." ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
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
    const message = formatClerkError(error);
    const status = message === "No autorizado." ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
