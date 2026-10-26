import { NextResponse } from "next/server";

import { formatClerkError } from "@/lib/clerk-users";
import { renameFamilyCard, requireSuperAdmin } from "@/lib/family-admin";

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
