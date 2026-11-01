"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

import { PinField } from "@/components/pin-help";
import { isPin } from "@/lib/pin-rules";

/** Sube el scroll hasta que el bloque quede pegado al borde superior visible (sobre el teclado). */
function pinToTop(el: HTMLElement | null) {
  if (!el) return;
  const run = () => {
    const vv = window.visualViewport;
    const targetTop = el.getBoundingClientRect().top + window.scrollY;
    const visibleTop = vv?.offsetTop ?? 0;
    window.scrollTo({ top: Math.max(0, targetTop - visibleTop - 8), behavior: "smooth" });
  };
  run();
  // El teclado anima ~300ms; repetimos cuando ya achicó el viewport.
  window.setTimeout(run, 150);
  window.setTimeout(run, 350);
}

export function ChildSignIn() {
  const [familyName, setFamilyName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const familyBlockRef = useRef<HTMLLabelElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  const ready = familyName.trim().length > 0 && isPin(pin);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/child-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyName, pin }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo entrar.");
        return;
      }
      window.location.assign("/yo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh px-6 pt-8 pb-[55vh] sm:grid sm:place-items-center sm:py-16 sm:pb-16">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl border border-line bg-card p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold tracking-[0.14em] text-muted uppercase">Niños</p>
        <h1 className="mt-2 font-serif text-4xl">¡Hola!</h1>
        <p className="mt-2 text-sm text-muted">Entra con el nombre de tu familia y tu PIN.</p>
        <label ref={familyBlockRef} className="mt-6 block text-sm">
          Familia
          <input
            value={familyName}
            onChange={(event) => setFamilyName(event.target.value)}
            onFocus={() => pinToTop(familyBlockRef.current)}
            className="mt-1.5 w-full rounded-2xl border border-line px-4 py-3"
            autoComplete="organization"
            enterKeyHint="next"
          />
        </label>
        <div ref={pinRef} className="mt-4">
          <PinField
            label="PIN"
            value={pin}
            onChange={setPin}
            showRules={false}
            onFocus={() => pinToTop(pinRef.current)}
          />
        </div>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-6">
          <button
            disabled={!ready || loading}
            className="w-full rounded-2xl bg-accent py-3 font-bold text-white disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
          <Link
            href="/"
            className="mt-3 block w-full rounded-2xl border border-line bg-background px-4 py-3 text-center font-bold"
          >
            Volver al inicio
          </Link>
        </div>
      </form>
    </main>
  );
}
