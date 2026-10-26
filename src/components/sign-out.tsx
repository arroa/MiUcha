"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function AdultSignOut({ via }: { via: "dev" | "clerk" }) {
  if (via === "dev") return <DevSignOut href="/sign-in" endpoint="/api/auth/dev-logout" />;
  return <ClerkSignOut />;
}

export function ChildSignOut() {
  return <DevSignOut href="/entrar" endpoint="/api/child-auth/logout" />;
}

function DevSignOut({ href, endpoint }: { href: string; endpoint: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="shrink-0 rounded-2xl bg-foreground px-5 py-3 text-sm font-bold text-background"
      onClick={async () => {
        await fetch(endpoint, { method: "POST" });
        router.push(href);
        router.refresh();
      }}
    >
      Salir
    </button>
  );
}

function ClerkSignOut() {
  const { signOut } = useClerk();
  return (
    <button type="button" className="shrink-0 rounded-2xl bg-foreground px-5 py-3 text-sm font-bold text-background" onClick={() => signOut({ redirectUrl: "/sign-in" })}>
      Salir
    </button>
  );
}
