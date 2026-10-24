import { NextResponse } from "next/server";

import { normalizeEmail } from "@/lib/clerk-users";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { createDevSessionToken, devSessionCookieOptions } from "@/lib/dev-session";

export async function POST(request: Request) {
  if (!isDevBypassEnabled()) {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }
  const json = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = normalizeEmail(json?.email ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }
  const token = await createDevSessionToken(`dev:${email}`);
  const response = NextResponse.json({ ok: true });
  const cookie = devSessionCookieOptions(token);
  response.cookies.set(cookie.name, cookie.value, cookie);
  return response;
}
