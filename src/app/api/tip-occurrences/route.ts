import { NextResponse } from "next/server";

import { jsonErrorResponse } from "@/lib/http-errors";
import { historyForCurrentAdult, pendingForCurrentAdult, tasksForCurrentChild } from "@/lib/tip-cycle";

export async function GET(request: Request) {
  try {
    const queue = new URL(request.url).searchParams.get("queue");
    if (queue === "review") {
      const adult = await pendingForCurrentAdult();
      if (!adult) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
      return NextResponse.json({ tasks: adult.tasks });
    }
    if (queue === "history") {
      const adult = await historyForCurrentAdult();
      if (!adult) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
      return NextResponse.json({ tasks: adult.tasks });
    }

    const tasks = await tasksForCurrentChild();
    if (!tasks) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    return NextResponse.json({ tasks });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
