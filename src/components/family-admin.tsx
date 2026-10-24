"use client";

import { useState, type FormEvent } from "react";

type FamilyListItem = { id: string; name: string; banqueroName: string; banqueroEmail: string };
type ChildItem = { id: string; name: string; gender: "nino" | "nina"; birthDate: string; loginId: string };
type AuditorItem = { id: string; name: string; email: string };
type FamilyDetail = {
  id: string;
  name: string;
  pctInversion: number;
  pctGasto: number;
  pctDonaciones: number;
  interestPercent: number;
};

export function FamilyAdmin({
  isSuperAdmin,
  families,
  family,
  children,
  auditors,
}: {
  isSuperAdmin: boolean;
  families: FamilyListItem[];
  family: FamilyDetail | null;
  children: ChildItem[];
  auditors: AuditorItem[];
}) {
  return (
    <div className="mx-auto grid max-w-3xl gap-8">
      {isSuperAdmin ? <CreateFamily initialFamilies={families} /> : null}
      {family ? <BanqueroPanel family={family} children={children} auditors={auditors} /> : null}
    </div>
  );
}

function CreateFamily({ initialFamilies }: { initialFamilies: FamilyListItem[] }) {
  const [families, setFamilies] = useState(initialFamilies);
  const [name, setName] = useState("");
  const [banqueroName, setBanqueroName] = useState("");
  const [banqueroEmail, setBanqueroEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, banqueroName, banqueroEmail }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; family?: { name: string } } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo crear la familia.");
        return;
      }
      setFamilies((current) => [
        { id: crypto.randomUUID(), name, banqueroName, banqueroEmail },
        ...current,
      ]);
      setName("");
      setBanqueroName("");
      setBanqueroEmail("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-card p-6">
      <h2 className="font-serif text-3xl">Nueva familia</h2>
      <p className="mt-1 text-sm text-muted">Tú creas la familia y a la persona que guarda la plata.</p>
      <form onSubmit={onSubmit} className="mt-5 grid gap-3">
        <Input label="Nombre de la familia" value={name} onChange={setName} />
        <Input label="Nombre del banquero" value={banqueroName} onChange={setBanqueroName} />
        <Input label="Correo del banquero" type="email" value={banqueroEmail} onChange={setBanqueroEmail} />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button disabled={busy} className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
          {busy ? "Creando…" : "Crear familia"}
        </button>
      </form>
      <ul className="mt-6 divide-y divide-line text-sm">
        {families.map((family) => (
          <li key={family.id} className="py-3">
            <strong>{family.name}</strong>
            <span className="block text-muted">
              {family.banqueroName} · {family.banqueroEmail}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BanqueroPanel({
  family,
  children,
  auditors,
}: {
  family: FamilyDetail;
  children: ChildItem[];
  auditors: AuditorItem[];
}) {
  const [params, setParams] = useState(family);
  const [childRows, setChildRows] = useState(children);
  const [auditorRows, setAuditorRows] = useState(auditors);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveParams(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/families/current", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pctInversion: Number(params.pctInversion),
        pctGasto: Number(params.pctGasto),
        pctDonaciones: Number(params.pctDonaciones),
        interestPercent: Number(params.interestPercent),
      }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "No se pudieron guardar los porcentajes.");
      return;
    }
    setMessage("Parámetros guardados.");
  }

  return (
    <div className="grid gap-8">
      <section className="rounded-3xl border border-line bg-card p-6">
        <h2 className="font-serif text-3xl">{family.name}</h2>
        <form onSubmit={saveParams} className="mt-5 grid gap-3 sm:grid-cols-2">
          <Input label="Inversión %" type="number" value={String(params.pctInversion)} onChange={(value) => setParams({ ...params, pctInversion: Number(value) })} />
          <Input label="Gasto %" type="number" value={String(params.pctGasto)} onChange={(value) => setParams({ ...params, pctGasto: Number(value) })} />
          <Input label="Donaciones %" type="number" value={String(params.pctDonaciones)} onChange={(value) => setParams({ ...params, pctDonaciones: Number(value) })} />
          <Input label="Interés mensual %" type="number" value={String(params.interestPercent)} onChange={(value) => setParams({ ...params, interestPercent: Number(value) })} />
          {error ? <p className="text-sm text-red-700 sm:col-span-2">{error}</p> : null}
          {message ? <p className="text-sm text-accent sm:col-span-2">{message}</p> : null}
          <button className="rounded-2xl bg-accent px-4 py-3 font-bold text-white sm:col-span-2">Guardar parámetros</button>
        </form>
      </section>
      <NewChild onCreated={(child) => setChildRows((rows) => [...rows, child])} />
      <People title="Niños" empty="Todavía no hay niños." rows={childRows.map((child) => `${child.name} · ${child.loginId}`)} />
      <NewAuditor onCreated={(auditor) => setAuditorRows((rows) => [...rows, auditor])} />
      <People title="Auditores" empty="Todavía no hay auditores." rows={auditorRows.map((auditor) => `${auditor.name} · ${auditor.email}`)} />
    </div>
  );
}

function NewChild({ onCreated }: { onCreated: (child: ChildItem) => void }) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"nino" | "nina">("nino");
  const [birthDate, setBirthDate] = useState("");
  const [loginId, setLoginId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, gender, birthDate, loginId, pin }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string; child?: ChildItem } | null;
    if (!res.ok || !data?.child) {
      setError(data?.error ?? "No se pudo crear al niño.");
      return;
    }
    onCreated(data.child);
    setName("");
    setBirthDate("");
    setLoginId("");
    setPin("");
  }

  return (
    <section className="rounded-3xl border border-line bg-card p-6">
      <h2 className="font-serif text-3xl">Nuevo niño</h2>
      <form onSubmit={onSubmit} className="mt-5 grid gap-3">
        <Input label="Nombre" value={name} onChange={setName} />
        <label className="text-sm">
          Niño o niña
          <select value={gender} onChange={(event) => setGender(event.target.value as "nino" | "nina")} className="mt-1.5 w-full rounded-2xl border border-line px-4 py-3">
            <option value="nino">Niño</option>
            <option value="nina">Niña</option>
          </select>
        </label>
        <Input label="Fecha de nacimiento" type="date" value={birthDate} onChange={setBirthDate} />
        <Input label="Identificador para entrar" value={loginId} onChange={setLoginId} />
        <Input label="PIN de 6 números" value={pin} onChange={setPin} />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button className="rounded-2xl bg-accent px-4 py-3 font-bold text-white">Crear niño</button>
      </form>
    </section>
  );
}

function NewAuditor({ onCreated }: { onCreated: (auditor: AuditorItem) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const res = await fetch("/api/auditors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "No se pudo crear al auditor.");
      return;
    }
    onCreated({ id: crypto.randomUUID(), name, email });
    setName("");
    setEmail("");
  }

  return (
    <section className="rounded-3xl border border-line bg-card p-6">
      <h2 className="font-serif text-3xl">Nuevo auditor</h2>
      <form onSubmit={onSubmit} className="mt-5 grid gap-3">
        <Input label="Nombre" value={name} onChange={setName} />
        <Input label="Correo" type="email" value={email} onChange={setEmail} />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button className="rounded-2xl bg-accent px-4 py-3 font-bold text-white">Crear auditor</button>
      </form>
    </section>
  );
}

function People({ title, rows, empty }: { title: string; rows: string[]; empty: string }) {
  return (
    <section>
      <h2 className="font-serif text-2xl">{title}</h2>
      {rows.length === 0 ? <p className="mt-2 text-sm text-muted">{empty}</p> : null}
      <ul className="mt-2 text-sm">
        {rows.map((row) => (
          <li key={row} className="border-t border-line py-2">
            {row}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="text-sm">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-2xl border border-line bg-white px-4 py-3" />
    </label>
  );
}
