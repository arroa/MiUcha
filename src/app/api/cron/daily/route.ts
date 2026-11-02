import { NextResponse } from "next/server";

import { jsonErrorResponse } from "@/lib/http-errors";
import { ensureAllTodayTasks } from "@/lib/tip-cycle";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    await ensureAllTodayTasks();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
