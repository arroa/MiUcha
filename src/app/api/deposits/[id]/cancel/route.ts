import { NextResponse } from "next/server";

import { formatClerkError } from "@/lib/clerk-users";
import { cancelDepositForActor } from "@/lib/money";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await cancelDepositForActor(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = formatClerkError(error);
    const status = message === "No autorizado." ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
