import { NextResponse } from "next/server";

import { getChildSession } from "@/lib/child-account";
import { formatClerkError } from "@/lib/clerk-users";
import { setFavoriteGoalForChild } from "@/lib/goals";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const child = await getChildSession();
  if (!child) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    const goal = await setFavoriteGoalForChild(child, id);
    return NextResponse.json({ ok: true, goal });
  } catch (error) {
    return NextResponse.json({ error: formatClerkError(error) }, { status: 400 });
  }
}
