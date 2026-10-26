import { NextResponse } from "next/server";

import { formatClerkError } from "@/lib/clerk-users";
import { createFamily, listFamilies, requireSuperAdmin } from "@/lib/family-admin";

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  return NextResponse.json({ families: await listFamilies() });
}

export async function POST(request: Request) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const json = (await request.json().catch(() => null)) as {
    mine?: boolean;
    banqueroName?: string;
    banqueroEmail?: string;
  } | null;

  try {
    if (json?.mine && session.role === "banquero" && session.familyId) {
      return NextResponse.json({ error: "Ya tienes una familia." }, { status: 400 });
    }
    const family = await createFamily({
      banqueroName: json?.mine ? json.banqueroName || session.name : (json?.banqueroName ?? ""),
      banqueroEmail: json?.mine ? session.email : (json?.banqueroEmail ?? ""),
    });
    return NextResponse.json({ ok: true, family }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: formatClerkError(error) }, { status: 400 });
  }
}
