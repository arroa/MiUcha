"use client";

import { useSignIn } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { acceso } from "@/lib/acceso.config";

type Props = { devBypass: boolean; clerkEnabled: boolean };

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function SignInForm({ devBypass, clerkEnabled }: Props) {
  if (devBypass) return <DevForm />;
  if (clerkEnabled) return <ClerkForm />;
  return (
    <Card title="Falta Clerk o el bypass">
      <p className="text-sm text-muted">
        En <code>.env.local</code> define <code>APP_DEV_BYPASS=true</code> y <code>DEV_SESSION_SECRET</code>, o las keys
        de Clerk.
      </p>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-full place-items-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-line bg-card p-8 shadow-sm">
        <h1 className="font-serif text-4xl text-foreground">{title}</h1>
        <div className="mt-6">{children}</div>
        <Link
          href="/"
          className="mt-3 block w-full rounded-2xl border border-line bg-background px-4 py-3 text-center font-bold"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
      />
    </label>
  );
}

function DevForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isEmail(email)) {
      setError("Revisa el correo.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setError("No se pudo entrar en modo desarrollo.");
        return;
      }
      window.location.assign(acceso.rutaDespuesDeEntrar);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title={`Entrar a ${acceso.producto}`}>
      <p className="mb-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900">Modo desarrollo: sin código ni Clerk.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Correo" type="email" value={email} onChange={setEmail} autoComplete="email" />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button disabled={loading} className="w-full rounded-2xl bg-accent py-3 font-bold text-white disabled:opacity-50">
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </Card>
  );
}

function ClerkForm() {
  const clerk = useSignIn();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!clerk.isLoaded || !clerk.signIn || !clerk.setActive) {
    return (
      <main className="grid min-h-full place-items-center text-muted">
        <p>Cargando…</p>
      </main>
    );
  }

  const signIn = clerk.signIn;
  const setActive = clerk.setActive;

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    if (!isEmail(email)) {
      setError("Revisa el correo.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await signIn.create({ identifier: email.trim().toLowerCase() });
      const factor = result.supportedFirstFactors?.find((item) => item.strategy === "email_code");
      if (!factor || !("emailAddressId" in factor)) {
        setError("Activa el código por email en Clerk.");
        return;
      }
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      setStep("code");
    } catch {
      setError("No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) {
      setError("Ingresa el código que te enviamos.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await signIn.attemptFirstFactor({ strategy: "email_code", code: code.trim() });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        window.location.assign(acceso.rutaDespuesDeEntrar);
        return;
      }
      setError("No se pudo completar el acceso.");
    } catch {
      setError("Código inválido o expirado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title={`Entrar a ${acceso.producto}`}>
      <form onSubmit={step === "email" ? sendCode : verifyCode} className="space-y-4">
        {step === "email" ? (
          <Field label="Correo" type="email" value={email} onChange={setEmail} autoComplete="email" />
        ) : (
          <Field label="Código" value={code} onChange={setCode} autoComplete="one-time-code" />
        )}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button disabled={loading} className="w-full rounded-2xl bg-accent py-3 font-bold text-white disabled:opacity-50">
          {loading ? "…" : step === "email" ? "Enviar código" : "Entrar"}
        </button>
      </form>
    </Card>
  );
}
