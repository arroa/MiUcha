import { NextResponse } from "next/server";

import { jsonErrorResponse } from "@/lib/http-errors";

import { getChildSession } from "@/lib/child-account";
import { submitTask } from "@/lib/tip-cycle";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const child = await getChildSession();
  if (!child) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  try {
    await submitTask(child, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
