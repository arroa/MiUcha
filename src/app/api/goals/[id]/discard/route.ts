import { NextResponse } from "next/server";

import { getChildSession } from "@/lib/child-account";
import { jsonErrorResponse } from "@/lib/http-errors";
import { discardGoalForChild } from "@/lib/goals";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const child = await getChildSession();
  if (!child) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    const goal = await discardGoalForChild(child, id);
    return NextResponse.json({ ok: true, goal });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
