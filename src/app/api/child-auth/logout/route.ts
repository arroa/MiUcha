import { NextResponse } from "next/server";

import { clearChildSessionCookieOptions } from "@/lib/child-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const cookie = clearChildSessionCookieOptions();
  response.cookies.set(cookie.name, cookie.value, cookie);
  return response;
}
