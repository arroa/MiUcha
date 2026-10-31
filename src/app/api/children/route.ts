import { NextResponse } from "next/server";

import { formatClerkError } from "@/lib/clerk-users";
import { createChildAccount, requireBanquero } from "@/lib/family-admin";

export async function POST(request: Request) {
  const session = await requireBanquero();
  if (!session?.familyId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const json = (await request.json().catch(() => null)) as {
    name?: string;
    birthDate?: string;
    loginId?: string;
    pin?: string;
  } | null;

  try {
    const child = await createChildAccount({
      familyId: session.familyId,
      name: json?.name ?? "",
      birthDate: json?.birthDate ?? "",
      loginId: json?.loginId ?? "",
      pin: json?.pin ?? "",
    });
    return NextResponse.json({ ok: true, child }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: formatClerkError(error) }, { status: 400 });
  }
}
