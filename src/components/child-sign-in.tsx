"use client";

import Link from "next/link";
import { useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";

import { PinHelp } from "@/components/pin-help";

export function ChildSignIn() {
  const [familyName, setFamilyName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
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
        <div className="mt-4 text-sm">
          <p id="pin-label">PIN</p>
          <PinBoxes value={pin} onChange={setPin} />
          <PinHelp />
        </div>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        <button disabled={loading} className="mt-6 w-full rounded-2xl bg-accent py-3 font-bold text-white disabled:opacity-50">
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

function PinBoxes({ value, onChange }: { value: string; onChange: (pin: string) => void }) {
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  function focusBox(index: number) {
    boxes.current[Math.max(0, Math.min(index, 5))]?.focus();
  }

  function apply(next: string, focus: number) {
    const pin = next.replace(/\D/g, "").slice(0, 6);
    onChange(pin);
    focusBox(focus);
  }

  function onBoxChange(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      apply(value.slice(0, index) + value.slice(index + 1), index);
      return;
    }
    if (digits.length > 1) {
      const pin = (value.slice(0, index) + digits).slice(0, 6);
      apply(pin, pin.length >= 6 ? 5 : pin.length);
      return;
    }
    const pin = (value.slice(0, index) + digits + value.slice(index + 1)).slice(0, 6);
    apply(pin, index < 5 ? index + 1 : 5);
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (value[index]) {
        apply(value.slice(0, index) + value.slice(index + 1), index);
        return;
      }
      if (index > 0) apply(value.slice(0, index - 1), index - 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(Math.min(index + 1, value.length));
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (digits) apply(digits, digits.length);
  }

  return (
    <div className="mt-2 grid grid-cols-6 gap-2" role="group" aria-labelledby="pin-label">
      {Array.from({ length: 6 }, (_, index) => (
        <input
          key={index}
          ref={(node) => {
            boxes.current[index] = node;
          }}
          value={value[index] ?? ""}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={index === 0 ? 6 : 1}
          aria-label={`Número ${index + 1} del PIN`}
          onChange={(event) => onBoxChange(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={onPaste}
          onFocus={(event) => {
            const next = Math.min(index, value.length);
            if (next !== index) {
              focusBox(next);
              return;
            }
            event.currentTarget.select();
          }}
          className="aspect-square w-full min-w-0 rounded-2xl border border-line bg-white text-center text-2xl font-bold tabular-nums outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 sm:text-3xl"
        />
      ))}
    </div>
  );
}
