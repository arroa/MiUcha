import { NextResponse } from "next/server";

import { jsonErrorResponse } from "@/lib/http-errors";
import { deactivateChild, getChildCartola, requireBanquero, requireFamilyAdult, updateChildAccount } from "@/lib/family-admin";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireFamilyAdult();
  if (!session?.familyId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await params;
  try {
    const cartola = await getChildCartola(session.familyId, id);
    return NextResponse.json({ cartola });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBanquero();
  if (!session?.familyId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await params;

  const json = (await request.json().catch(() => null)) as { active?: boolean } | null;
  try {
    if (json?.active === false) {
      await deactivateChild(session.familyId, id);
      return NextResponse.json({ ok: true });
    }
    const child = await updateChildAccount(session.familyId, id, json);
    return NextResponse.json({ ok: true, child });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
