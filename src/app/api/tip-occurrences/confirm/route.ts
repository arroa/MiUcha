import { NextResponse } from "next/server";

import { jsonErrorResponse } from "@/lib/http-errors";

import { getChildSession } from "@/lib/child-account";
import { confirmDay } from "@/lib/tip-cycle";

export async function POST(request: Request) {
  const child = await getChildSession();
  if (!child) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const json = (await request.json().catch(() => null)) as { date?: string; ids?: string[] } | null;
  try {
    await confirmDay(child, json?.date ?? "", Array.isArray(json?.ids) ? json.ids : []);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
