import { NextResponse } from "next/server";

import { getChildSession } from "@/lib/child-account";
import { jsonErrorResponse } from "@/lib/http-errors";
import { createGoalForChild, listGoalsForChild } from "@/lib/goals";
import type { GoalStatus } from "@/lib/collections";

export async function GET(request: Request) {
  const child = await getChildSession();
  if (!child) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const statusParam = new URL(request.url).searchParams.get("status");
    const status =
      statusParam === "active" || statusParam === "achieved" || statusParam === "discarded" || statusParam === "all"
        ? (statusParam as GoalStatus | "all")
        : "active";
    const data = await listGoalsForChild(child, status);
    return NextResponse.json(data);
  } catch (error) {
    return jsonErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const child = await getChildSession();
  if (!child) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const goal = await createGoalForChild(child, await request.json().catch(() => null));
    return NextResponse.json({ ok: true, goal }, { status: 201 });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
