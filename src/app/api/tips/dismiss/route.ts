import { NextResponse } from "next/server";

import { jsonErrorResponse } from "@/lib/http-errors";
import { requireBanquero } from "@/lib/family-admin";
import { dismissFamilyTask } from "@/lib/tips";

export async function POST(request: Request) {
  const session = await requireBanquero();
  if (!session?.familyId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const json = (await request.json().catch(() => null)) as { key?: string } | null;
  try {
    await dismissFamilyTask(session.familyId, json?.key ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
