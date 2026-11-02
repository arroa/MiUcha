import { NextResponse } from "next/server";

import { jsonErrorResponse } from "@/lib/http-errors";
import { createAuditorAccount, removeAuditor, requireBanquero } from "@/lib/family-admin";

export async function POST(request: Request) {
  const session = await requireBanquero();
  if (!session?.familyId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const json = (await request.json().catch(() => null)) as { name?: string; email?: string } | null;
  try {
    const auditor = await createAuditorAccount({
      familyId: session.familyId,
      name: json?.name ?? "",
      email: json?.email ?? "",
    });
    return NextResponse.json({ ok: true, auditor }, { status: 201 });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const session = await requireBanquero();
  if (!session?.familyId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const json = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!json?.id) return NextResponse.json({ error: "Falta el auditor." }, { status: 400 });
  try {
    await removeAuditor(session.familyId, json.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
