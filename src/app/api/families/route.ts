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
    name?: string;
    banqueroName?: string;
    banqueroEmail?: string;
  } | null;

  try {
    const family = await createFamily({
      name: json?.name ?? "",
      banqueroName: json?.banqueroName ?? "",
      banqueroEmail: json?.banqueroEmail ?? "",
    });
    return NextResponse.json({ ok: true, family }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: formatClerkError(error) }, { status: 400 });
  }
}
