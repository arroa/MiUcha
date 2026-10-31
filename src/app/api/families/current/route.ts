import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { adults, children, families } from "@/lib/collections";
import { formatClerkError } from "@/lib/clerk-users";
import { requireBanquero, updateFamilyParameters } from "@/lib/family-admin";

export async function GET() {
  const session = await requireBanquero();
  if (!session?.familyId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const familyId = new ObjectId(session.familyId);
  const family = await (await families()).findOne({ _id: familyId });
  if (!family) return NextResponse.json({ error: "Familia no encontrada." }, { status: 404 });

  const [childRows, auditorRows] = await Promise.all([
    (await children()).find({ familyId, active: true }).sort({ name: 1 }).toArray(),
    (await adults()).find({ familyId, role: "auditor" }).sort({ name: 1 }).toArray(),
  ]);

  return NextResponse.json({
    family: {
      id: family._id.toHexString(),
      name: family.name,
      pctInversion: family.pctInversion,
      pctGasto: family.pctGasto,
      pctDonaciones: family.pctDonaciones,
    },
    children: childRows.map((child) => ({
      id: child._id.toHexString(),
      name: child.name,
      birthDate: child.birthDate,
      loginId: child.loginId,
    })),
    auditors: auditorRows.map((auditor) => ({
      id: auditor._id.toHexString(),
      name: auditor.name,
      email: auditor.email,
    })),
  });
}

export async function PATCH(request: Request) {
  const session = await requireBanquero();
  if (!session?.familyId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const json = (await request.json().catch(() => null)) as {
    name?: string;
    pctInversion?: number;
    pctGasto?: number;
    pctDonaciones?: number;
  } | null;

  try {
    await updateFamilyParameters({
      familyId: session.familyId,
      name: json?.name ?? "",
      pctInversion: Number(json?.pctInversion),
      pctGasto: Number(json?.pctGasto),
      pctDonaciones: Number(json?.pctDonaciones),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: formatClerkError(error) }, { status: 400 });
  }
}
