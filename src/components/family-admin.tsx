"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { FamilyTips } from "@/components/family-tips";
import { PinHelp } from "@/components/pin-help";
import type { TipView } from "@/lib/tips";

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
  selfEmail,
  selfName,
  families,
  family,
  children,
  auditors,
  tips,
  onFamilyRenamed,
}: {
  isSuperAdmin: boolean;
  selfEmail: string;
  selfName: string;
  families: FamilyListItem[];
  family: FamilyDetail | null;
  children: ChildItem[];
  auditors: AuditorItem[];
  tips: TipView[];
  onFamilyRenamed?: (name: string) => void;
}) {
  const ownsFamily = families.some((item) => item.banqueroEmail === selfEmail);
  return (
    <div className="mx-auto grid max-w-3xl gap-8">
      {isSuperAdmin ? <FamilyList families={families} selfEmail={selfEmail} /> : null}
      {isSuperAdmin && !ownsFamily ? <CreateMine email={selfEmail} defaultName={selfName} /> : null}
      {isSuperAdmin ? <CreateFamily /> : null}
      {family ? <BanqueroPanel family={family} children={children} auditors={auditors} tips={tips} onFamilyRenamed={onFamilyRenamed} /> : null}
    </div>
  );
}

function FamilyList({ families, selfEmail }: { families: FamilyListItem[]; selfEmail: string }) {
  const [rows, setRows] = useState(families);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <section className="rounded-3xl border border-line bg-card p-6">
      <h2 className="font-serif text-3xl">Familias</h2>
      {rows.length === 0 ? <p className="mt-3 text-sm text-muted">Todavía no hay familias.</p> : null}
      <ul className="mt-5 grid gap-3">
        {rows.map((item) => (
          <FamilyCard
            key={item.id}
            item={item}
            mine={item.banqueroEmail === selfEmail}
            onSaved={(next) => {
              setRows((current) => current.map((row) => (row.id === next.id ? next : row)));
              setToast(`Listo. El banquero se llama ${next.banqueroName}.`);
            }}
          />
        ))}
      </ul>
      {toast ? (
        <p role="status" className="fixed bottom-6 left-1/2 z-50 max-w-sm -translate-x-1/2 rounded-2xl bg-foreground px-5 py-3 text-center text-sm font-bold text-background shadow-lg">
          {toast}
        </p>
      ) : null}
    </section>
  );
}

function FamilyCard({ item, mine, onSaved }: { item: FamilyListItem; mine: boolean; onSaved: (item: FamilyListItem) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [banqueroName, setBanqueroName] = useState(item.banqueroName);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function beginEdit() {
    setName(item.name);
    setBanqueroName(item.banqueroName);
    setError("");
    setEditing(true);
  }

  function cancel() {
    setName(item.name);
    setBanqueroName(item.banqueroName);
    setError("");
    setEditing(false);
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/families/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, banqueroName }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; family?: { name: string; banqueroName: string; banqueroEmail: string } } | null;
      if (!res.ok || !data?.family) {
        setError(data?.error ?? "No se pudo guardar.");
        return;
      }
      setEditing(false);
      onSaved({ ...item, name: data.family.name, banqueroName: data.family.banqueroName, banqueroEmail: data.family.banqueroEmail });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl border border-line bg-white p-4">
      <p className="text-sm font-bold text-accent">{mine ? "Tu familia" : "Familia"}</p>
      {editing ? (
        <label className="mt-3 block text-sm">
          Nombre de la familia
          <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-2xl border border-line bg-white px-4 py-3" />
        </label>
      ) : (
        <p className="mt-1 font-serif text-2xl">{item.name.trim() || "Todavía sin nombre"}</p>
      )}
      {editing ? (
        <label className="mt-3 block text-sm">
          Nombre del banquero
          <input value={banqueroName} onChange={(event) => setBanqueroName(event.target.value)} className="mt-1.5 w-full rounded-2xl border border-line bg-white px-4 py-3" />
        </label>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted">Banquero</p>
          <p className="font-bold">{item.banqueroName}</p>
        </>
      )}
      <p className={`${editing ? "mt-3" : "mt-1"} text-sm text-muted`}>{item.banqueroEmail}</p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className={`mt-4 grid gap-2 ${mine || editing ? "grid-cols-2" : "grid-cols-1"}`}>
        {editing ? (
          <>
            <button type="button" disabled={busy} onClick={save} className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
              {busy ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" disabled={busy} onClick={cancel} className="rounded-2xl border border-foreground/20 px-4 py-3 font-bold disabled:opacity-50">
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={beginEdit} className="rounded-2xl border border-foreground/20 px-4 py-3 font-bold">
              Editar
            </button>
            {mine ? (
              <a href="/familia" className="rounded-2xl bg-accent px-4 py-3 text-center font-bold text-white">
                Entrar
              </a>
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}

function CreateMine({ email, defaultName }: { email: string; defaultName: string }) {
  const [name, setName] = useState(defaultName);
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
        body: JSON.stringify({ mine: true, banqueroName: name }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo crear tu familia.");
        return;
      }
      window.location.assign("/familia");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-card p-6">
      <h2 className="font-serif text-3xl">Mi familia</h2>
      <p className="mt-1 text-sm text-muted">Tú guardas la plata. Después le pones el nombre.</p>
      <form onSubmit={onSubmit} className="mt-5 grid gap-3">
        <Input label="Tu nombre" value={name} onChange={setName} />
        <p className="text-sm">
          Correo
          <span className="mt-1.5 block rounded-2xl border border-line bg-background px-4 py-3">{email}</span>
        </p>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button disabled={busy} className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
          {busy ? "Creando…" : "Crear mi familia"}
        </button>
      </form>
    </section>
  );
}

function CreateFamily() {
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
        body: JSON.stringify({ banqueroName, banqueroEmail }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo crear la familia.");
        return;
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-card p-6">
      <h2 className="font-serif text-3xl">Otra familia</h2>
      <p className="mt-1 text-sm text-muted">Creas al banquero. Él le pone el nombre a su familia.</p>
      <form onSubmit={onSubmit} className="mt-5 grid gap-3">
        <Input label="Nombre del banquero" value={banqueroName} onChange={setBanqueroName} />
        <Input label="Correo del banquero" type="email" value={banqueroEmail} onChange={setBanqueroEmail} />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button disabled={busy} className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
          {busy ? "Creando…" : "Crear familia"}
        </button>
      </form>
    </section>
  );
}

type SectionId = "datos" | "ninos" | "auditores" | "tips";

const SECTIONS: { id: SectionId; short: string }[] = [
  { id: "datos", short: "Datos" },
  { id: "ninos", short: "Niños" },
  { id: "auditores", short: "Auditores" },
  { id: "tips", short: "Tips" },
];

function BanqueroPanel({
  family,
  children,
  auditors,
  tips,
  onFamilyRenamed,
}: {
  family: FamilyDetail;
  children: ChildItem[];
  auditors: AuditorItem[];
  tips: TipView[];
  onFamilyRenamed?: (name: string) => void;
}) {
  const [open, setOpen] = useState<SectionId | null>(null);
  const [params, setParams] = useState(family);
  const [childRows, setChildRows] = useState(children);
  const [auditorRows, setAuditorRows] = useState(auditors);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    document.getElementById(`panel-${open}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [open]);

  function toggle(id: SectionId) {
    setOpen((current) => (current === id ? null : id));
  }

  async function saveParams(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/families/current", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: params.name,
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
    onFamilyRenamed?.(params.name.trim());
  }

  return (
    <div className="grid gap-4">
      {open ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              aria-pressed={open === section.id}
              onClick={() => toggle(section.id)}
              className={`rounded-2xl border px-3 py-3 text-left font-serif text-lg ${open === section.id ? "border-accent bg-accent/10" : "border-line bg-white"}`}
            >
              {section.short}
            </button>
          ))}
        </div>
      ) : null}
      <div className={open ? "grid" : "grid gap-4 sm:grid-cols-2"}>
        <div className={open && open !== "datos" ? "hidden" : ""}>
          <DatosPanel
            mode={open === "datos" ? "open" : "preview"}
            onToggle={() => toggle("datos")}
            params={params}
            setParams={setParams}
            onSubmit={saveParams}
            error={error}
            message={message}
          />
        </div>
        <div className={open && open !== "ninos" ? "hidden" : ""}>
          <Children mode={open === "ninos" ? "open" : "preview"} onToggle={() => toggle("ninos")} rows={childRows} setRows={setChildRows} />
        </div>
        <div className={open && open !== "auditores" ? "hidden" : ""}>
          <Auditors mode={open === "auditores" ? "open" : "preview"} onToggle={() => toggle("auditores")} rows={auditorRows} setRows={setAuditorRows} />
        </div>
        <div className={open && open !== "tips" ? "hidden" : ""}>
          <FamilyTips mode={open === "tips" ? "open" : "preview"} onToggle={() => toggle("tips")} initialTips={tips} />
        </div>
      </div>
    </div>
  );
}

function PreviewCard({ title, onOpen, children }: { title: string; onOpen: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onOpen} className="flex h-full w-full flex-col rounded-3xl border border-line bg-card p-4 text-left hover:border-accent">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-serif text-2xl">{title}</span>
        <span className="text-sm font-bold text-accent">Abrir</span>
      </span>
      <span className="mt-3 grid grid-cols-2 gap-2">{children}</span>
    </button>
  );
}

function OpenCard({ id, title, onClose, hint, children }: { id: SectionId; title: string; onClose: () => void; hint?: string; children: ReactNode }) {
  return (
    <section id={`panel-${id}`} className="scroll-mt-36 rounded-3xl border border-line bg-card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-3xl">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-sm font-bold text-muted">
          Cerrar
        </button>
      </div>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MiniStat({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <span className={`rounded-2xl border border-line bg-white px-3 py-2 ${wide ? "col-span-2" : ""}`}>
      <span className="block text-xs text-muted">{label}</span>
      <span className="block truncate font-bold">{value}</span>
    </span>
  );
}

function MiniButton({
  label,
  value,
  onClick,
  dashed,
  active,
}: {
  label: string;
  value: string;
  onClick: () => void;
  dashed?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-3 py-3 text-left hover:border-accent ${dashed ? "border-dashed border-accent/50 bg-white" : active ? "border-accent bg-accent/10" : "border-line bg-white"}`}
    >
      <span className="block truncate text-xs text-muted">{label}</span>
      <span className="block truncate font-serif text-xl">{value}</span>
    </button>
  );
}

function DatosPanel({
  mode,
  onToggle,
  params,
  setParams,
  onSubmit,
  error,
  message,
}: {
  mode: "preview" | "open";
  onToggle: () => void;
  params: FamilyDetail;
  setParams: (params: FamilyDetail) => void;
  onSubmit: (event: FormEvent) => void;
  error: string;
  message: string;
}) {
  if (mode === "preview") {
    return (
      <PreviewCard title="Datos generales" onOpen={onToggle}>
        <MiniStat wide label="Familia" value={params.name || "Sin nombre"} />
        <MiniStat label="Inversión" value={`${params.pctInversion}%`} />
        <MiniStat label="Gasto" value={`${params.pctGasto}%`} />
        <MiniStat label="Donaciones" value={`${params.pctDonaciones}%`} />
        <MiniStat label="Interés" value={`${params.interestPercent}%`} />
      </PreviewCard>
    );
  }

  return (
    <OpenCard id="datos" title="Datos generales" onClose={onToggle}>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Nombre de la familia" value={params.name} onChange={(value) => setParams({ ...params, name: value })} />
          <p className="mt-2 text-sm text-muted">El niño escribe este nombre para entrar. No puede repetirse.</p>
        </div>
        <Input label="Inversión %" type="number" value={String(params.pctInversion)} onChange={(value) => setParams({ ...params, pctInversion: Number(value) })} />
        <Input label="Gasto %" type="number" value={String(params.pctGasto)} onChange={(value) => setParams({ ...params, pctGasto: Number(value) })} />
        <Input label="Donaciones %" type="number" value={String(params.pctDonaciones)} onChange={(value) => setParams({ ...params, pctDonaciones: Number(value) })} />
        <Input label="Interés mensual %" type="number" value={String(params.interestPercent)} onChange={(value) => setParams({ ...params, interestPercent: Number(value) })} />
        {error ? <p className="text-sm text-red-700 sm:col-span-2">{error}</p> : null}
        {message ? <p className="text-sm text-accent sm:col-span-2">{message}</p> : null}
        <button className="rounded-2xl bg-accent px-4 py-3 font-bold text-white sm:col-span-2">Guardar parámetros</button>
      </form>
    </OpenCard>
  );
}

function NewChild({ onCreated, onCancel }: { onCreated: (child: ChildItem) => void; onCancel: () => void }) {
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
    <div className="rounded-2xl border border-accent bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-serif text-2xl">Nuevo niño</p>
        <button type="button" onClick={onCancel} className="text-sm font-bold text-muted">
          Cerrar
        </button>
      </div>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        <Input label="Nombre" value={name} onChange={setName} />
        <label className="text-sm">
          Niño o niña
          <select value={gender} onChange={(event) => setGender(event.target.value as "nino" | "nina")} className="mt-1.5 w-full rounded-2xl border border-line px-4 py-3">
            <option value="nino">Niño</option>
            <option value="nina">Niña</option>
          </select>
        </label>
        <Input label="Fecha de nacimiento" type="date" value={birthDate} onChange={setBirthDate} />
        <Input label="Nombre en la casa" value={loginId} onChange={setLoginId} />
        <div>
          <Input label="PIN de 6 números" value={pin} onChange={setPin} />
          <PinHelp />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button className="rounded-2xl bg-accent px-4 py-3 font-bold text-white">Crear niño</button>
      </form>
    </div>
  );
}

function NewAuditor({ onCreated, onCancel }: { onCreated: (auditor: AuditorItem) => void; onCancel: () => void }) {
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
    const data = (await res.json().catch(() => null)) as { error?: string; auditor?: AuditorItem } | null;
    if (!res.ok || !data?.auditor) {
      setError(data?.error ?? "No se pudo crear al auditor.");
      return;
    }
    onCreated(data.auditor);
    setName("");
    setEmail("");
  }

  return (
    <div className="rounded-2xl border border-accent bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-serif text-2xl">Nuevo auditor</p>
        <button type="button" onClick={onCancel} className="text-sm font-bold text-muted">
          Cerrar
        </button>
      </div>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        <Input label="Nombre" value={name} onChange={setName} />
        <Input label="Correo" type="email" value={email} onChange={setEmail} />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button className="rounded-2xl bg-accent px-4 py-3 font-bold text-white">Crear auditor</button>
      </form>
    </div>
  );
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function birthLabel(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const month = match ? MONTHS[Number(match[2]) - 1] : "";
  if (!match || !month) return "";
  return `${Number(match[3])} de ${month} de ${match[1]}`;
}

function useToast() {
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);
  return [toast, setToast] as const;
}

function Notice({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="status" className="fixed bottom-6 left-1/2 z-50 max-w-sm -translate-x-1/2 rounded-2xl bg-foreground px-5 py-3 text-center text-sm font-bold text-background shadow-lg">
      {message}
    </p>
  );
}

function Children({
  rows,
  setRows,
  mode,
  onToggle,
}: {
  rows: ChildItem[];
  setRows: (update: (rows: ChildItem[]) => ChildItem[]) => void;
  mode: "preview" | "open";
  onToggle: () => void;
}) {
  const [toast, setToast] = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const shown = rows.slice(0, 4);

  useEffect(() => {
    if (mode === "preview") setSelected(null);
  }, [mode]);

  if (mode === "preview") {
    return (
      <PreviewCard title="Niños" onOpen={onToggle}>
        {shown.map((child) => (
          <MiniStat key={child.id} wide={shown.length === 1} label={child.gender === "nina" ? "Niña" : "Niño"} value={child.name} />
        ))}
        {rows.length > shown.length ? <MiniStat label="Más" value={`+${rows.length - shown.length}`} /> : null}
        {rows.length === 0 ? <span className="col-span-2 text-sm text-muted">Todavía no hay niños.</span> : null}
      </PreviewCard>
    );
  }

  return (
    <OpenCard id="ninos" title="Niños" onClose={onToggle} hint="Toca una tarjeta para verla en grande.">
      <ul className="grid grid-cols-2 gap-2">
        <li className="col-span-2">
          {selected === "new" ? (
            <NewChild
              onCancel={() => setSelected(null)}
              onCreated={(child) => {
                setRows((current) => [...current, child]);
                setSelected(child.id);
              }}
            />
          ) : (
            <MiniButton dashed label="Sumar" value="Nuevo niño" onClick={() => setSelected("new")} />
          )}
        </li>
        {rows.map((child) => (
          <li key={child.id} className={selected === child.id ? "col-span-2" : ""}>
            {selected === child.id ? (
              <ChildCard
                child={child}
                onCollapse={() => setSelected(null)}
                onSaved={(next) => {
                  setRows((current) => current.map((row) => (row.id === next.id ? next : row)));
                  setToast(`Datos de ${next.name} guardados.`);
                }}
                onRemoved={(name) => {
                  setRows((current) => current.filter((row) => row.id !== child.id));
                  setSelected(null);
                  setToast(`${name} quedó de baja.`);
                }}
              />
            ) : (
              <MiniButton label={child.gender === "nina" ? "Niña" : "Niño"} value={child.name} onClick={() => setSelected(child.id)} />
            )}
          </li>
        ))}
      </ul>
      <Notice message={toast} />
    </OpenCard>
  );
}

function ChildCard({
  child,
  onSaved,
  onRemoved,
  onCollapse,
}: {
  child: ChildItem;
  onSaved: (child: ChildItem) => void;
  onRemoved: (name: string) => void;
  onCollapse: () => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "baja">("view");
  const [name, setName] = useState(child.name);
  const [gender, setGender] = useState(child.gender);
  const [birthDate, setBirthDate] = useState(child.birthDate);
  const [loginId, setLoginId] = useState(child.loginId);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const born = birthLabel(child.birthDate);

  function beginEdit() {
    setName(child.name);
    setGender(child.gender);
    setBirthDate(child.birthDate);
    setLoginId(child.loginId);
    setPin("");
    setError("");
    setMode("edit");
  }

  function cancel() {
    setError("");
    setMode("view");
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/children/${child.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, gender, birthDate, loginId, pin }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; child?: ChildItem } | null;
      if (!res.ok || !data?.child) {
        setError(data?.error ?? "No se pudo guardar.");
        return;
      }
      setMode("view");
      onSaved(data.child);
    } finally {
      setBusy(false);
    }
  }

  async function confirmBaja() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/children/${child.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo dar de baja.");
        return;
      }
      onRemoved(child.name);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-accent bg-white p-4">
      {mode === "view" ? (
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={onCollapse} className="text-sm font-bold text-muted">
            Cerrar
          </button>
        </div>
      ) : null}
      {mode === "edit" ? (
        <div className="grid gap-3">
          <Input label="Nombre" value={name} onChange={setName} />
          <label className="text-sm">
            Niño o niña
            <select value={gender} onChange={(event) => setGender(event.target.value as "nino" | "nina")} className="mt-1.5 w-full rounded-2xl border border-line px-4 py-3">
              <option value="nino">Niño</option>
              <option value="nina">Niña</option>
            </select>
          </label>
          <Input label="Fecha de nacimiento" type="date" value={birthDate} onChange={setBirthDate} />
          <Input label="Nombre en la casa" value={loginId} onChange={setLoginId} />
          <div>
            <Input label="PIN nuevo, si lo cambias" value={pin} onChange={setPin} />
            <PinHelp />
          </div>
        </div>
      ) : (
        <>
          <p className="font-serif text-2xl">{child.name}</p>
          <p className="mt-1 text-sm font-bold text-accent">{child.gender === "nina" ? "Niña" : "Niño"}</p>
          <p className="mt-3 text-sm">
            En casa, <span className="font-bold">{child.loginId}</span>
          </p>
          {born ? <p className="mt-1 text-sm text-muted">{born}</p> : null}
        </>
      )}
      {mode === "baja" ? <p className="mt-3 text-sm">{child.name} deja de poder entrar. Su libro se queda.</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {mode === "edit" ? (
          <>
            <button type="button" disabled={busy} onClick={save} className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
              {busy ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" disabled={busy} onClick={cancel} className="rounded-2xl border border-foreground/20 px-4 py-3 font-bold disabled:opacity-50">
              Cancelar
            </button>
          </>
        ) : mode === "baja" ? (
          <>
            <button type="button" disabled={busy} onClick={confirmBaja} className="rounded-2xl bg-red-800 px-4 py-3 font-bold text-white disabled:opacity-50">
              {busy ? "Dando de baja…" : "Confirmar baja"}
            </button>
            <button type="button" disabled={busy} onClick={cancel} className="rounded-2xl border border-foreground/20 px-4 py-3 font-bold disabled:opacity-50">
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={beginEdit} className="rounded-2xl border border-foreground/20 px-4 py-3 font-bold">
              Modificar
            </button>
            <button type="button" onClick={() => { setError(""); setMode("baja"); }} className="rounded-2xl border border-red-800/30 px-4 py-3 font-bold text-red-800">
              Baja
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Auditors({
  rows,
  setRows,
  mode,
  onToggle,
}: {
  rows: AuditorItem[];
  setRows: (update: (rows: AuditorItem[]) => AuditorItem[]) => void;
  mode: "preview" | "open";
  onToggle: () => void;
}) {
  const [toast, setToast] = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const shown = rows.slice(0, 4);

  useEffect(() => {
    if (mode === "preview") setSelected(null);
  }, [mode]);

  if (mode === "preview") {
    return (
      <PreviewCard title="Auditores" onOpen={onToggle}>
        {shown.map((auditor) => (
          <MiniStat key={auditor.id} wide={shown.length === 1} label={auditor.email} value={auditor.name} />
        ))}
        {rows.length > shown.length ? <MiniStat label="Más" value={`+${rows.length - shown.length}`} /> : null}
        {rows.length === 0 ? <span className="col-span-2 text-sm text-muted">Todavía no hay auditores.</span> : null}
      </PreviewCard>
    );
  }

  return (
    <OpenCard id="auditores" title="Auditores" onClose={onToggle} hint="Toca una tarjeta para verla en grande.">
      <ul className="grid grid-cols-2 gap-2">
        <li className="col-span-2">
          {selected === "new" ? (
            <NewAuditor
              onCancel={() => setSelected(null)}
              onCreated={(auditor) => {
                setRows((current) => [...current, auditor]);
                setSelected(auditor.id);
              }}
            />
          ) : (
            <MiniButton dashed label="Sumar" value="Nuevo auditor" onClick={() => setSelected("new")} />
          )}
        </li>
        {rows.map((auditor) => (
          <li key={auditor.id} className={selected === auditor.id ? "col-span-2" : ""}>
            {selected === auditor.id ? (
              <AuditorCard
                auditor={auditor}
                onCollapse={() => setSelected(null)}
                onSaved={(next) => {
                  setRows((current) => current.map((row) => (row.id === next.id ? next : row)));
                  setToast(`Datos de ${next.name} guardados.`);
                }}
                onRemoved={(name) => {
                  setRows((current) => current.filter((row) => row.id !== auditor.id));
                  setSelected(null);
                  setToast(`${name} quedó de baja.`);
                }}
              />
            ) : (
              <MiniButton label={auditor.email} value={auditor.name} onClick={() => setSelected(auditor.id)} />
            )}
          </li>
        ))}
      </ul>
      <Notice message={toast} />
    </OpenCard>
  );
}

function AuditorCard({
  auditor,
  onSaved,
  onRemoved,
  onCollapse,
}: {
  auditor: AuditorItem;
  onSaved: (auditor: AuditorItem) => void;
  onRemoved: (name: string) => void;
  onCollapse: () => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "baja">("view");
  const [name, setName] = useState(auditor.name);
  const [email, setEmail] = useState(auditor.email);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function beginEdit() {
    setName(auditor.name);
    setEmail(auditor.email);
    setError("");
    setMode("edit");
  }

  function cancel() {
    setError("");
    setMode("view");
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/auditors/${auditor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; auditor?: AuditorItem } | null;
      if (!res.ok || !data?.auditor) {
        setError(data?.error ?? "No se pudo guardar.");
        return;
      }
      setMode("view");
      onSaved(data.auditor);
    } finally {
      setBusy(false);
    }
  }

  async function confirmBaja() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/auditors/${auditor.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo dar de baja.");
        return;
      }
      onRemoved(auditor.name);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-accent bg-white p-4">
      {mode === "view" ? (
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={onCollapse} className="text-sm font-bold text-muted">
            Cerrar
          </button>
        </div>
      ) : null}
      {mode === "edit" ? (
        <div className="grid gap-3">
          <Input label="Nombre" value={name} onChange={setName} />
          <Input label="Correo" type="email" value={email} onChange={setEmail} />
        </div>
      ) : (
        <>
          <p className="font-serif text-2xl">{auditor.name}</p>
          <p className="mt-2 text-sm text-muted">{auditor.email}</p>
        </>
      )}
      {mode === "baja" ? <p className="mt-3 text-sm">{auditor.name} deja de ser auditor de esta familia.</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {mode === "edit" ? (
          <>
            <button type="button" disabled={busy} onClick={save} className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
              {busy ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" disabled={busy} onClick={cancel} className="rounded-2xl border border-foreground/20 px-4 py-3 font-bold disabled:opacity-50">
              Cancelar
            </button>
          </>
        ) : mode === "baja" ? (
          <>
            <button type="button" disabled={busy} onClick={confirmBaja} className="rounded-2xl bg-red-800 px-4 py-3 font-bold text-white disabled:opacity-50">
              {busy ? "Dando de baja…" : "Confirmar baja"}
            </button>
            <button type="button" disabled={busy} onClick={cancel} className="rounded-2xl border border-foreground/20 px-4 py-3 font-bold disabled:opacity-50">
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={beginEdit} className="rounded-2xl border border-foreground/20 px-4 py-3 font-bold">
              Modificar
            </button>
            <button type="button" onClick={() => { setError(""); setMode("baja"); }} className="rounded-2xl border border-red-800/30 px-4 py-3 font-bold text-red-800">
              Baja
            </button>
          </>
        )}
      </div>
    </div>
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
