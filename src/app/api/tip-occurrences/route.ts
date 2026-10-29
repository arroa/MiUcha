import { NextResponse } from "next/server";

import { pendingForCurrentAdult, tasksForCurrentChild } from "@/lib/tip-cycle";

export async function GET(request: Request) {
  const queue = new URL(request.url).searchParams.get("queue");
  if (queue === "review") {
    const adult = await pendingForCurrentAdult();
    if (!adult) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    return NextResponse.json({ tasks: adult.tasks });
  }

  const tasks = await tasksForCurrentChild();
  if (!tasks) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  return NextResponse.json({ tasks });
}
