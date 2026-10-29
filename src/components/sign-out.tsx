"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdultSignOut({ via }: { via: "dev" | "clerk" }) {
  if (via === "dev") return <DevSignOut href="/sign-in" endpoint="/api/auth/dev-logout" />;
  return <ClerkSignOut />;
}

export function ChildSignOut({ name, cheer }: { name: string; cheer: string }) {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function leave() {
    setLeaving(true);
    const res = await fetch("/api/child-auth/logout", { method: "POST" });
    if (!res.ok) {
      setLeaving(false);
      return;
    }
    window.location.assign("/entrar");
  }

  return (
    <>
      <button type="button" className="shrink-0 rounded-2xl bg-foreground px-5 py-3 text-sm font-bold text-background" onClick={() => setOpen(true)}>
        Salir
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-6" role="presentation" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="despedida"
            className="w-full max-w-md rounded-3xl bg-card p-8 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-bold text-accent">¡Felicitaciones!</p>
            <h2 id="despedida" className="mt-2 font-serif text-4xl">
              ¡Hasta pronto, {name}!
            </h2>
            <p className="mt-4 text-lg">{cheer}</p>
            <button
              type="button"
              disabled={leaving}
              onClick={leave}
              className="mt-6 w-full rounded-2xl bg-accent py-3 font-bold text-white disabled:opacity-50"
            >
              {leaving ? "Saliendo…" : "¡Chao!"}
            </button>
            <button type="button" className="mt-3 w-full rounded-2xl border border-line py-3 font-bold" onClick={() => setOpen(false)}>
              Me quedo
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
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
