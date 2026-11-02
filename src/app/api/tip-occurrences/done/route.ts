import { NextResponse } from "next/server";

import { jsonErrorResponse } from "@/lib/http-errors";

import { getChildSession } from "@/lib/child-account";
import { confirmTipWhen, type TipWhen } from "@/lib/tip-cycle";

export async function POST(request: Request) {
  const child = await getChildSession();
  if (!child) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const json = (await request.json().catch(() => null)) as { id?: string; when?: TipWhen } | null;
  try {
    if (json?.when !== "hoy" && json?.when !== "ayer") {
      return NextResponse.json({ error: "Elige si lo hiciste hoy o ayer." }, { status: 400 });
    }
    const result = await confirmTipWhen(child, json?.id ?? "", json.when);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
