import { acceso } from "@/lib/acceso.config";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { createSignedToken, readSignedToken } from "@/lib/signed-cookie";

const TWELVE_HOURS = 12 * 60 * 60;

function secret(): string {
  const value = process.env.DEV_SESSION_SECRET ?? process.env.CLERK_SECRET_KEY;
  if (!value) throw new Error("Define DEV_SESSION_SECRET o CLERK_SECRET_KEY para APP_DEV_BYPASS");
  return value;
}

export async function createDevSessionToken(userId: string): Promise<string> {
  return createSignedToken(userId, secret(), TWELVE_HOURS);
}

export async function verifyDevSessionToken(token: string): Promise<string | null> {
  if (!isDevBypassEnabled()) return null;
  const value = process.env.DEV_SESSION_SECRET ?? process.env.CLERK_SECRET_KEY;
  if (!value) return null;
  return readSignedToken(token, value);
}

export function devSessionCookieOptions(token: string) {
  return {
    name: acceso.cookieDev,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function clearDevSessionCookieOptions() {
  return { ...devSessionCookieOptions(""), maxAge: 0 };
}

export async function readDevSessionFromRequest(request: Request): Promise<string | null> {
  if (!isDevBypassEnabled()) return null;
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${acceso.cookieDev}=([^;]+)`));
  if (!match?.[1]) return null;
  return verifyDevSessionToken(decodeURIComponent(match[1]));
}
