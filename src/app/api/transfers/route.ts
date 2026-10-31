import { NextResponse } from "next/server";

import { getChildSession } from "@/lib/child-account";
import { formatClerkError } from "@/lib/clerk-users";
import { transferGastoToInversion, walletsSnapshot } from "@/lib/money";

export async function POST(request: Request) {
  const child = await getChildSession();
  if (!child) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    await transferGastoToInversion(child, await request.json().catch(() => null));
    const wallets = await walletsSnapshot(child.familyId, child._id);
    return NextResponse.json({ ok: true, wallets });
  } catch (error) {
    return NextResponse.json({ error: formatClerkError(error) }, { status: 400 });
  }
}
