import { NextResponse } from "next/server";

import { formatClerkError } from "@/lib/clerk-users";
import { removeAuditor, requireBanquero, updateAuditorAccount } from "@/lib/family-admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBanquero();
  if (!session?.familyId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await params;
  try {
    const auditor = await updateAuditorAccount(session.familyId, id, await request.json().catch(() => null));
    return NextResponse.json({ ok: true, auditor });
  } catch (error) {
    return NextResponse.json({ error: formatClerkError(error) }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBanquero();
  if (!session?.familyId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await params;
  try {
    await removeAuditor(session.familyId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: formatClerkError(error) }, { status: 400 });
  }
}
