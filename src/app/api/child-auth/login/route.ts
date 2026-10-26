import { NextResponse } from "next/server";

import { children, families } from "@/lib/collections";
import { childSessionCookieOptions, createChildSessionToken } from "@/lib/child-session";
import { familyNameKey } from "@/lib/family-name";
import { verifyPin } from "@/lib/pin";

const LOCK_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const json = (await request.json().catch(() => null)) as { familyName?: string; pin?: string } | null;
  const familyName = json?.familyName?.trim() ?? "";
  const pin = json?.pin?.trim() ?? "";
  if (!familyName || !pin) {
    return NextResponse.json({ error: "Escribe el nombre de tu familia y tu PIN." }, { status: 400 });
  }

  const familyCol = await families();
  const family = await familyCol.findOne({ nameKey: familyNameKey(familyName) });
  if (!family) {
    return NextResponse.json({ error: "No encontramos esa familia. Pídele ayuda a un adulto." }, { status: 401 });
  }
  if (family.loginLockedUntil && family.loginLockedUntil.getTime() > Date.now()) {
    return NextResponse.json({ error: "Demasiados intentos. Espera un poco o pide un PIN nuevo." }, { status: 429 });
  }

  const col = await children();
  const candidates = await col.find({ familyId: family._id, active: true }).toArray();
  const matches = [];
  for (const child of candidates) {
    if (await verifyPin(pin, child.pinHash)) matches.push(child);
  }
  if (matches.length > 1) {
    return NextResponse.json({ error: "Ese PIN está repetido en la familia. Pídele al banquero que lo cambie." }, { status: 409 });
  }
  const child = matches[0];
  if (!child) {
    const attempts = (family.loginAttempts ?? 0) + 1;
    await familyCol.updateOne(
      { _id: family._id },
      { $set: { loginAttempts: attempts, loginLockedUntil: attempts >= 5 ? new Date(Date.now() + LOCK_MS) : null } },
    );
    return NextResponse.json({ error: "Ese PIN no coincide. Inténtalo otra vez." }, { status: 401 });
  }
  if (child.pinLockedUntil && child.pinLockedUntil.getTime() > Date.now()) {
    return NextResponse.json({ error: "Demasiados intentos. Espera un poco o pide un PIN nuevo." }, { status: 429 });
  }

  await Promise.all([
    familyCol.updateOne({ _id: family._id }, { $set: { loginAttempts: 0, loginLockedUntil: null } }),
    col.updateOne({ _id: child._id }, { $set: { pinAttempts: 0, pinLockedUntil: null } }),
  ]);
  const token = await createChildSessionToken(child._id.toHexString());
  const response = NextResponse.json({ ok: true });
  const cookie = childSessionCookieOptions(token);
  response.cookies.set(cookie.name, cookie.value, cookie);
  return response;
}
