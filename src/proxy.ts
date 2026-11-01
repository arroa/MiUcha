import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { readChildSessionFromRequest } from "@/lib/child-session";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { readDevSessionFromRequest } from "@/lib/dev-session";
import { redirectTo } from "@/lib/request-url";

function hasClerkKeys() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

function isChildRoute(pathname: string) {
  return pathname === "/yo" || pathname.startsWith("/yo/");
}

function isPublic(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/sign-in") ||
    pathname === "/entrar" ||
    pathname === "/despues" ||
    pathname === "/sin-acceso" ||
    pathname.startsWith("/api/auth/dev-login") ||
    pathname.startsWith("/api/auth/dev-logout") ||
    pathname.startsWith("/api/child-auth/login") ||
    pathname.startsWith("/api/child-auth/logout") ||
    pathname.startsWith("/api/cron")
  );
}

async function hasDevSession(request: NextRequest) {
  if (!isDevBypassEnabled()) return false;
  return Boolean(await readDevSessionFromRequest(request));
}

async function guardWithoutClerk(request: NextRequest) {
  if (await hasDevSession(request)) return NextResponse.next();
  const pathname = request.nextUrl.pathname;
  if (isPublic(pathname)) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  return redirectTo(request, "/sign-in");
}

const withClerk = clerkMiddleware(
  async (auth, request) => {
    if (await hasDevSession(request)) return;
    const pathname = request.nextUrl.pathname;
    // Debe correr en rutas públicas para el handshake de sesión de Clerk.
    if (isPublic(pathname)) return;
    await auth.protect({
      unauthenticatedUrl: new URL("/sign-in", request.url).href,
    });
  },
  {
    signInUrl: "/sign-in",
  },
);

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;

  if (isChildRoute(pathname)) {
    if (await readChildSessionFromRequest(request)) return NextResponse.next();
    return redirectTo(request, "/entrar");
  }

  if (
    (pathname.startsWith("/api/tip-occurrences") ||
      pathname.startsWith("/api/wallets") ||
      pathname.startsWith("/api/withdrawals") ||
      pathname.startsWith("/api/transfers") ||
      pathname.startsWith("/api/child-news") ||
      pathname.startsWith("/api/goals")) &&
    (await readChildSessionFromRequest(request))
  ) {
    return NextResponse.next();
  }

  if (!hasClerkKeys()) return guardWithoutClerk(request);
  return withClerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
