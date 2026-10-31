import { NextResponse } from "next/server";

import { formatClerkError } from "@/lib/clerk-users";
import { deleteFamily, renameFamilyCard, requireSuperAdmin } from "@/lib/family-admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await params;
  try {
    const family = await renameFamilyCard(id, await request.json().catch(() => null));
    return NextResponse.json({ ok: true, family });
  } catch (error) {
    return NextResponse.json({ error: formatClerkError(error) }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await params;
  try {
    const family = await deleteFamily(id);
    return NextResponse.json({ ok: true, family, mine: family.id === session.familyId });
  } catch (error) {
    return NextResponse.json({ error: formatClerkError(error) }, { status: 400 });
  }
}
