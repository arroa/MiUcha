import { NextResponse } from "next/server";

/** Origen visto por el cliente (IP/LAN), no el localhost interno de `next dev`. */
export function requestOrigin(request: Request): string {
  const incoming = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return incoming.origin;
  const proto = request.headers.get("x-forwarded-proto") ?? incoming.protocol.replace(/:$/, "");
  return `${proto}://${host}`;
}

export function absoluteUrl(request: Request, path: string): URL {
  return new URL(path, requestOrigin(request));
}

export function redirectTo(request: Request, path: string, status = 303) {
  return NextResponse.redirect(absoluteUrl(request, path), status);
}
