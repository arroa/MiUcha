"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { PinField } from "@/components/pin-help";
import { isPin } from "@/lib/pin-rules";

export function ChildSignIn() {
  const [familyName, setFamilyName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <main className="grid min-h-full place-items-center px-6 py-16">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl border border-line bg-card p-8 shadow-sm">
        <p className="text-xs font-bold tracking-[0.14em] text-muted uppercase">Niños</p>
        <h1 className="mt-2 font-serif text-4xl">¡Hola!</h1>
        <p className="mt-2 text-sm text-muted">Entra con el nombre de tu familia y tu PIN.</p>
        <label className="mt-6 block text-sm">
          Familia
          <input
            value={familyName}
            onChange={(event) => setFamilyName(event.target.value)}
            className="mt-1.5 w-full rounded-2xl border border-line px-4 py-3"
            autoComplete="organization"
          />
        </label>
        <div className="mt-4">
          <PinField label="PIN" value={pin} onChange={setPin} />
        </div>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        <button disabled={!ready || loading} className="mt-6 w-full rounded-2xl bg-accent py-3 font-bold text-white disabled:opacity-50">
          {loading ? "Entrando…" : "Entrar"}
        </button>
        <Link
          href="/"
          className="mt-3 block w-full rounded-2xl border border-line bg-background px-4 py-3 text-center font-bold"
        >
          Volver al inicio
        </Link>
      </form>
    </main>
  );
}
