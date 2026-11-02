import { NextResponse } from "next/server";

import { getChildSession } from "@/lib/child-account";
import { jsonErrorResponse } from "@/lib/http-errors";
import { transferGastoToInversion, walletsSnapshot } from "@/lib/money";

export async function POST(request: Request) {
  const child = await getChildSession();
  if (!child) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    await transferGastoToInversion(child, await request.json().catch(() => null));
    const wallets = await walletsSnapshot(child.familyId, child._id);
    return NextResponse.json({ ok: true, wallets });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
