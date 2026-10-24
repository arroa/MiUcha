import { NextResponse } from "next/server";

import { children } from "@/lib/collections";
import { childSessionCookieOptions, createChildSessionToken } from "@/lib/child-session";
import { verifyPin } from "@/lib/pin";

const LOCK_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const json = (await request.json().catch(() => null)) as { loginId?: string; pin?: string } | null;
  const loginId = json?.loginId?.trim().toLowerCase() ?? "";
  const pin = json?.pin?.trim() ?? "";
  if (!loginId || !pin) {
    return NextResponse.json({ error: "Escribe tu identificador y tu PIN." }, { status: 400 });
  }

  const col = await children();
  const child = await col.findOne({ loginId, active: true });
  if (!child) {
    return NextResponse.json({ error: "No encontramos esa entrada. Pídele ayuda a un adulto." }, { status: 401 });
  }
  if (child.pinLockedUntil && child.pinLockedUntil.getTime() > Date.now()) {
    return NextResponse.json({ error: "Demasiados intentos. Espera un poco o pide un PIN nuevo." }, { status: 429 });
  }

  const ok = await verifyPin(pin, child.pinHash);
  if (!ok) {
    const attempts = child.pinAttempts + 1;
    await col.updateOne(
      { _id: child._id },
      {
        $set: {
          pinAttempts: attempts,
          pinLockedUntil: attempts >= 5 ? new Date(Date.now() + LOCK_MS) : null,
        },
      },
    );
    return NextResponse.json({ error: "Ese PIN no coincide. Inténtalo otra vez." }, { status: 401 });
  }

  await col.updateOne({ _id: child._id }, { $set: { pinAttempts: 0, pinLockedUntil: null } });
  const token = await createChildSessionToken(child._id.toHexString());
  const response = NextResponse.json({ ok: true });
  const cookie = childSessionCookieOptions(token);
  response.cookies.set(cookie.name, cookie.value, cookie);
  return response;
}
