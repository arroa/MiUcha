import { NextResponse } from "next/server";

import { jsonErrorResponse } from "@/lib/http-errors";
import { walletsForAdultChild, walletsForCurrentChild } from "@/lib/money";

export async function GET(request: Request) {
  try {
    const childId = new URL(request.url).searchParams.get("childId");
    if (childId) {
      const wallets = await walletsForAdultChild(childId);
      return NextResponse.json({ wallets });
    }
    const wallets = await walletsForCurrentChild();
    if (!wallets) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    return NextResponse.json({ wallets });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
