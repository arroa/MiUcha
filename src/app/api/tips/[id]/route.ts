import { NextResponse } from "next/server";

import { jsonErrorResponse } from "@/lib/http-errors";
import { requireBanquero } from "@/lib/family-admin";
import { updateFamilyTip } from "@/lib/tips";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBanquero();
  if (!session?.familyId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    const tip = await updateFamilyTip(session.familyId, id, await request.json().catch(() => null));
    return NextResponse.json({ ok: true, tip });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
