import { NextResponse } from "next/server";

import { ensureAllTodayTasks } from "@/lib/tip-cycle";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  await ensureAllTodayTasks();
  return NextResponse.json({ ok: true, interest: 0 });
}
