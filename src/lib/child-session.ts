import { createSignedToken, readSignedToken } from "@/lib/signed-cookie";

export const CHILD_COOKIE = "mihucha_child";
const TWELVE_HOURS = 12 * 60 * 60;

function secret(): string | null {
  return process.env.CHILD_SESSION_SECRET ?? process.env.DEV_SESSION_SECRET ?? null;
}

export async function createChildSessionToken(childId: string): Promise<string> {
  const value = secret();
  if (!value) throw new Error("Define CHILD_SESSION_SECRET o DEV_SESSION_SECRET");
  return createSignedToken(childId, value, TWELVE_HOURS);
}

export async function verifyChildSessionToken(token: string): Promise<string | null> {
  const value = secret();
  if (!value) return null;
  return readSignedToken(token, value);
}

export function childSessionCookieOptions(token: string) {
  return {
    name: CHILD_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function clearChildSessionCookieOptions() {
  return { ...childSessionCookieOptions(""), maxAge: 0 };
}

export async function readChildSessionFromRequest(request: Request): Promise<string | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${CHILD_COOKIE}=([^;]+)`));
  if (!match?.[1]) return null;
  return verifyChildSessionToken(decodeURIComponent(match[1]));
}
