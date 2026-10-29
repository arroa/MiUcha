import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { readChildSessionFromRequest } from "@/lib/child-session";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { readDevSessionFromRequest } from "@/lib/dev-session";

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
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/sign-in", request.url));
}

const withClerk = clerkMiddleware(async (auth, request) => {
  if (await hasDevSession(request)) return;
  await auth.protect();
});

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;

  if (isChildRoute(pathname)) {
    if (await readChildSessionFromRequest(request)) return NextResponse.next();
    return NextResponse.redirect(new URL("/entrar", request.url));
  }

  if (pathname.startsWith("/api/tip-occurrences") && (await readChildSessionFromRequest(request))) {
    return NextResponse.next();
  }

  if (isPublic(pathname)) return NextResponse.next();
  if (!hasClerkKeys()) return guardWithoutClerk(request);
  return withClerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
