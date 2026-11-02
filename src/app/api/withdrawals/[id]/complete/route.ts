import { NextResponse } from "next/server";

import { jsonErrorResponse } from "@/lib/http-errors";
import { completeWithdrawalForBanquero } from "@/lib/money";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await completeWithdrawalForBanquero(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
