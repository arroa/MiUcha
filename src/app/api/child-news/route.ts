import { NextResponse } from "next/server";

import { getChildSession } from "@/lib/child-account";
import { markChildNotice, type ChildNoticeKind } from "@/lib/child-feed";
import { jsonErrorResponse } from "@/lib/http-errors";

export async function POST(request: Request) {
  const child = await getChildSession();
  if (!child) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const json = (await request.json().catch(() => null)) as { id?: string; kind?: string; action?: string } | null;
  const id = typeof json?.id === "string" ? json.id : "";
  const kind = json?.kind;
  const action = json?.action;
  if ((kind !== "tip" && kind !== "interest") || (action !== "read" && action !== "dismiss") || !id) {
    return NextResponse.json({ error: "No se pudo actualizar el aviso." }, { status: 400 });
  }

  try {
    await markChildNotice(child, id, kind as ChildNoticeKind, action);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
