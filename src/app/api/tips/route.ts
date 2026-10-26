import { NextResponse } from "next/server";

import { formatClerkError } from "@/lib/clerk-users";
import { requireBanquero } from "@/lib/family-admin";
import { createCustomFamilyTip, createFamilyTip, listFamilyTips, saveFamilyCatalog } from "@/lib/tips";

export async function GET() {
  const session = await requireBanquero();
  if (!session?.familyId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const tips = await listFamilyTips(session.familyId);
  return NextResponse.json({ tips });
}

export async function PUT(request: Request) {
  const session = await requireBanquero();
  if (!session?.familyId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const tips = await saveFamilyCatalog(session.familyId, await request.json().catch(() => null));
    return NextResponse.json({ ok: true, tips });
  } catch (error) {
    return NextResponse.json({ error: formatClerkError(error) }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const session = await requireBanquero();
  if (!session?.familyId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const json = await request.json().catch(() => null);
    const tip = json && typeof json === "object" && "custom" in json && json.custom
      ? await createCustomFamilyTip(session.familyId, json)
      : await createFamilyTip(session.familyId, json);
    return NextResponse.json({ ok: true, tip }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: formatClerkError(error) }, { status: 400 });
  }
}
