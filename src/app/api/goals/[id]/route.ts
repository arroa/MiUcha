import { NextResponse } from "next/server";

import { getChildSession } from "@/lib/child-account";
import { formatClerkError } from "@/lib/clerk-users";
import { getGoalForChild, updateGoalForChild } from "@/lib/goals";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const child = await getChildSession();
  if (!child) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    const goal = await getGoalForChild(child, id);
    return NextResponse.json({ goal });
  } catch (error) {
    return NextResponse.json({ error: formatClerkError(error) }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const child = await getChildSession();
  if (!child) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    const goal = await updateGoalForChild(child, id, await request.json().catch(() => null));
    return NextResponse.json({ ok: true, goal });
  } catch (error) {
    return NextResponse.json({ error: formatClerkError(error) }, { status: 400 });
  }
}
