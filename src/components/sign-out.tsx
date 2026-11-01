"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect, useState } from "react";

import { UI_TOAST_DURATION_MS } from "@/lib/ui";

export function AdultSignOut({ via }: { via: "dev" | "clerk" }) {
  if (via === "dev") {
    return (
      <ConfirmSignOut
        onLeave={async () => {
          const res = await fetch("/api/auth/dev-logout", { method: "POST" });
          if (!res.ok) throw new Error("logout");
          window.location.assign("/sign-in");
        }}
      />
    );
  }
  return <ClerkSignOut />;
}

function ClerkSignOut() {
  const { signOut } = useClerk();
  return (
    <ConfirmSignOut
      onLeave={async () => {
        await signOut({ redirectUrl: "/sign-in" });
      }}
    />
  );
}

function ConfirmSignOut({ onLeave }: { onLeave: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!open || leaving) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, leaving]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), UI_TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function leave() {
    if (leaving) return;
    setLeaving(true);
    try {
      await onLeave();
    } catch {
      setLeaving(false);
      setToast("No se pudo cerrar la sesión. Inténtalo de nuevo.");
    }
  }

  function dismiss() {
    if (leaving) return;
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="shrink-0 rounded-2xl bg-foreground px-5 py-3 text-sm font-bold text-background"
        onClick={() => setOpen(true)}
      >
        Salir
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-6" role="presentation" onClick={dismiss}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="adulto-salir"
            className="relative w-full max-w-md rounded-3xl bg-card p-8 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            {leaving ? (
              <div className="absolute inset-0 z-10 grid place-items-center rounded-3xl bg-card/70" aria-busy="true">
                <p className="text-sm font-bold text-muted">Saliendo…</p>
              </div>
            ) : null}
            <button
              type="button"
              className="absolute right-4 top-4 text-sm font-bold text-muted disabled:opacity-50"
              onClick={dismiss}
              disabled={leaving}
              aria-label="Cerrar"
            >
              ✕
            </button>
            <h2 id="adulto-salir" className="pr-8 text-3xl font-extrabold">
              ¿Cerrar sesión?
            </h2>
            <p className="mt-4 text-lg text-muted">
              Vas a salir de MiHucha en este dispositivo. Para volver a entrar tendrás que identificarte otra vez.
            </p>
            <button
              type="button"
              disabled={leaving}
              onClick={() => void leave()}
              className="mt-6 w-full rounded-2xl bg-accent py-3 font-bold text-white disabled:opacity-50"
            >
              {leaving ? "Saliendo…" : "Continuar"}
            </button>
            <button
              type="button"
              disabled={leaving}
              className="mt-3 w-full rounded-2xl border border-line py-3 font-bold disabled:opacity-50"
              onClick={dismiss}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      {toast ? (
        <p
          role="status"
          className="mihucha-toast fixed top-6 right-6 z-[60] max-w-xs rounded-2xl border border-white/15 bg-foreground/60 px-4 py-3 text-sm font-bold text-background shadow-lg backdrop-blur-md"
        >
          {toast}
        </p>
      ) : null}
    </>
  );
}

export function ChildSignOut({ name, cheer }: { name: string; cheer: string }) {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!open || leaving) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, leaving]);

  async function leave() {
    if (leaving) return;
    setLeaving(true);
    const res = await fetch("/api/child-auth/logout", { method: "POST" });
    if (!res.ok) {
      setLeaving(false);
      return;
    }
    window.location.assign("/entrar");
  }

  function dismiss() {
    if (leaving) return;
    setOpen(false);
  }

  return (
    <>
      <button type="button" className="shrink-0 rounded-full bg-foreground px-4 py-2.5 text-sm font-bold text-background" onClick={() => setOpen(true)}>
        Salir
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-6" role="presentation" onClick={dismiss}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="despedida"
            className="relative w-full max-w-md rounded-3xl bg-card p-8 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            {leaving ? (
              <div className="absolute inset-0 z-10 grid place-items-center rounded-3xl bg-card/70" aria-busy="true">
                <p className="text-sm font-bold text-muted">Saliendo…</p>
              </div>
            ) : null}
            <button type="button" className="absolute right-4 top-4 text-sm font-bold text-muted disabled:opacity-50" onClick={dismiss} disabled={leaving} aria-label="Cerrar">
              ✕
            </button>
            <p className="text-sm font-bold text-accent">¡Felicitaciones!</p>
            <h2 id="despedida" className="mt-2 text-3xl font-extrabold">
              ¡Hasta pronto, {name}!
            </h2>
            <p className="mt-4 text-lg">{cheer}</p>
            <button
              type="button"
              disabled={leaving}
              onClick={() => void leave()}
              className="mt-6 w-full rounded-2xl bg-accent py-3 font-bold text-white disabled:opacity-50"
            >
              {leaving ? "Saliendo…" : "Continuar"}
            </button>
            <button type="button" disabled={leaving} className="mt-3 w-full rounded-2xl border border-line py-3 font-bold disabled:opacity-50" onClick={dismiss}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
