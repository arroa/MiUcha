import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    occurrences: 0,
    interest: 0,
    note: "El cron ya está cerrado. Las ocurrencias y el interés entran en el siguiente paso.",
  });
}
