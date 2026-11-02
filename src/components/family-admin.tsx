"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { FamilyRentabilidad } from "@/components/family-rentabilidad";
import { FamilyTips } from "@/components/family-tips";
import { PinField } from "@/components/pin-help";
import { TaskReview } from "@/components/task-review";
import { isPin } from "@/lib/pin-rules";
import type { TipView } from "@/lib/tips";

type FamilyListItem = {
  id: string;
  name: string;
  banqueroName: string;
  banqueroEmail: string;
  myRole: "banquero" | "auditor" | null;
};
type ChildItem = { id: string; name: string; birthDate: string; loginId: string };
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
  auditor = false,
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
  auditor?: boolean;
  selfEmail: string;
  selfName: string;
  families: FamilyListItem[];
  family: FamilyDetail | null;
  children: ChildItem[];
  auditors: AuditorItem[];
  tips: TipView[];
  onFamilyRenamed?: (name: string) => void;
}) {
  return (
    <div className="mx-auto grid max-w-3xl gap-8">
      {isSuperAdmin || families.length > 0 ? <FamilyList families={families} selfEmail={selfEmail} selfName={selfName} manage={isSuperAdmin} /> : null}
      {family ? <BanqueroPanel family={family} children={children} auditors={auditors} tips={tips} onFamilyRenamed={onFamilyRenamed} auditor={auditor} /> : null}
    </div>
  );
}

function FamilyList({
  families,
  selfEmail,
  selfName,
  manage,
}: {
  families: FamilyListItem[];
  selfEmail: string;
  selfName: string;
  manage: boolean;
}) {
  const [rows, setRows] = useState(families);
  const [toast, setToast] = useToast();
  const ordered = [...rows].sort((a, b) => Number(b.myRole === "banquero") - Number(a.myRole === "banquero"));
  const mine = ordered.find((item) => item.myRole === "banquero") ?? null;
  const others = ordered.filter((item) => item !== mine);

  function cardProps(item: FamilyListItem, isMine: boolean) {
    return {
      item,
      mine: isMine,
      onSaved: (next: FamilyListItem) => {
        setRows((current) => current.map((row) => (row.id === next.id ? next : row)));
        setToast(`${next.name.trim() || "La familia"} quedó guardada.`);
      },
      onRemoved: (removed: FamilyListItem & { mine: boolean }) => {
        if (removed.mine) {
          window.location.assign("/panel");
          return;
        }
        setRows((current) => current.filter((row) => row.id !== removed.id));
        setToast(`${removed.name.trim() || "La familia"} ya no está.`);
      },
    };
  }

  return (
    <section>
      <h2 className="font-serif text-3xl">Familias</h2>
      <ul className="mt-5 grid grid-cols-2 items-stretch gap-3">
        {mine ? <FamilyCard key={mine.id} {...cardProps(mine, true)} manage={manage} /> : manage ? <CreateMineCard email={selfEmail} defaultName={selfName} /> : null}
        {manage ? (
          <NewFamilyCard
            selfEmail={selfEmail}
            onCreated={(item) => {
              setRows((current) => [item, ...current.filter((row) => row.id !== item.id)]);
              const who = item.banqueroName.trim() || "el banquero";
              setToast(item.name.trim() ? `${item.name.trim()} quedó creada.` : `La familia de ${who} quedó creada.`);
            }}
          />
        ) : null}
        {others.map((item) => (
          <FamilyCard key={item.id} {...cardProps(item, false)} manage={manage} />
        ))}
      </ul>
      <Notice message={toast} />
    </section>
  );
}

function FamilyCard({
  item,
  mine,
  manage,
  onSaved,
  onRemoved,
}: {
  item: FamilyListItem;
  mine: boolean;
  manage: boolean;
  onSaved: (item: FamilyListItem) => void;
  onRemoved: (item: FamilyListItem & { mine: boolean }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(item.name);
  const [banqueroName, setBanqueroName] = useState(item.banqueroName);
  const [banqueroEmail, setBanqueroEmail] = useState(item.banqueroEmail);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!confirming || busy) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirming(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming, busy]);

  function beginEdit() {
    setName(item.name);
    setBanqueroName(item.banqueroName);
    setBanqueroEmail(item.banqueroEmail);
    setError("");
    setEditing(true);
  }

  function cancel() {
    setName(item.name);
    setBanqueroName(item.banqueroName);
    setBanqueroEmail(item.banqueroEmail);
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
        body: JSON.stringify({ name, banqueroName, banqueroEmail }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; family?: { name: string; banqueroName: string; banqueroEmail: string } } | null;
      if (!res.ok || !data?.family) {
        setError(data?.error ?? "No se pudo guardar.");
        return;
      }
      const next = { ...item, name: data.family.name, banqueroName: data.family.banqueroName, banqueroEmail: data.family.banqueroEmail };
      setEditing(false);
      if (mine && next.banqueroEmail !== item.banqueroEmail) {
        window.location.assign("/panel");
        return;
      }
      onSaved(next);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/families/${item.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo eliminar la familia.");
        return;
      }
      setConfirming(false);
      onRemoved({ ...item, mine });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-white p-3">
      <p className="text-xs font-bold text-accent">{mine ? "Mi familia" : item.myRole === "auditor" ? "Auditor" : item.myRole === "banquero" ? "Banquero" : "Familia"}</p>
      {editing ? (
        <label className="mt-2 block text-xs">
          Nombre de la familia
          <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm" />
        </label>
      ) : (
        <p className="mt-0.5 truncate font-serif text-xl leading-tight">{item.name.trim() || "Todavía sin nombre"}</p>
      )}
      {editing ? (
        <label className="mt-2 block text-xs">
          Nombre del banquero
          <input value={banqueroName} onChange={(event) => setBanqueroName(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm" />
        </label>
      ) : (
        <p className="mt-2 truncate text-sm font-bold">{item.banqueroName}</p>
      )}
      {editing ? (
        <label className="mt-2 block text-xs">
          Correo del banquero
          <input type="email" value={banqueroEmail} onChange={(event) => setBanqueroEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm" />
        </label>
      ) : (
        <p className="truncate text-xs text-muted">{item.banqueroEmail}</p>
      )}
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
      <div className="mt-auto flex flex-col gap-1.5 pt-3">
        {editing ? (
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" disabled={busy} onClick={save} className="min-w-0 rounded-xl bg-accent px-2 py-2 text-sm font-bold text-white disabled:opacity-50">
              {busy ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" disabled={busy} onClick={cancel} className="min-w-0 rounded-xl border border-foreground/20 px-2 py-2 text-sm font-bold disabled:opacity-50">
              Cancelar
            </button>
          </div>
        ) : (
          <>
            {manage || item.myRole ? (
              <div className={`grid gap-1.5 ${manage && item.myRole ? "grid-cols-2" : "grid-cols-1"}`}>
                {manage ? (
                  <button type="button" onClick={beginEdit} className="w-full min-w-0 rounded-xl border border-foreground/20 px-2 py-2 text-sm font-bold">
                    Editar
                  </button>
                ) : null}
                {item.myRole ? (
                  <a href={`/api/families/enter?id=${item.id}`} className="w-full min-w-0 rounded-xl bg-accent px-2 py-2 text-center text-sm font-bold text-white">
                    Entrar
                  </a>
                ) : null}
              </div>
            ) : null}
            {manage ? (
              <button type="button" onClick={() => { setError(""); setConfirming(true); }} className="w-full rounded-xl border border-red-800/30 px-2 py-2 text-sm font-bold text-red-800">
                Eliminar
              </button>
            ) : null}
          </>
        )}
      </div>
      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-6" role="presentation" onClick={() => { if (!busy) setConfirming(false); }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="eliminar-familia"
            className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="eliminar-familia" className="font-serif text-3xl">
              ¿Eliminar {item.name.trim() || "esta familia"}?
            </h2>
            <p className="mt-3">Se borran el banquero, los niños, las tareas y la plata. No se puede deshacer.</p>
            {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={remove} className="rounded-2xl bg-red-800 px-4 py-3 font-bold text-white disabled:opacity-50">
                {busy ? "Eliminando…" : "Eliminar"}
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="rounded-2xl border border-foreground/20 px-4 py-3 font-bold disabled:opacity-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function CreateMineCard({ email, defaultName }: { email: string; defaultName: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || busy) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy]);

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
    <li className="rounded-2xl border border-line bg-white">
      <button type="button" onClick={() => setOpen(true)} className="flex h-full min-h-36 w-full flex-col items-center justify-center gap-3 rounded-2xl px-3 py-4">
        <span className="text-xs font-bold text-accent">Mi familia</span>
        <span className="rounded-full border border-foreground/15 bg-background px-5 py-2 font-serif text-xl">Crear</span>
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-6" role="presentation" onClick={() => { if (!busy) setOpen(false); }}>
          <form
            onSubmit={onSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="crear-mi-familia"
            className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="crear-mi-familia" className="font-serif text-3xl">Mi familia</h2>
            <p className="mt-2 text-sm text-muted">Tú guardas la plata. Después le pones el nombre.</p>
            <div className="mt-5 grid gap-3">
              <Input label="Tu nombre" value={name} onChange={setName} />
              <p className="text-sm">
                Correo
                <span className="mt-1.5 block rounded-2xl border border-line bg-background px-4 py-3">{email}</span>
              </p>
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <button disabled={busy} className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
                {busy ? "Creando…" : "Crear mi familia"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </li>
  );
}

function NewFamilyCard({ selfEmail, onCreated }: { selfEmail: string; onCreated: (item: FamilyListItem) => void }) {
  const [open, setOpen] = useState(false);
  const [banqueroName, setBanqueroName] = useState("");
  const [banqueroEmail, setBanqueroEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || busy) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy]);

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
      const data = (await res.json().catch(() => null)) as { error?: string; family?: { id: string; name: string } } | null;
      if (!res.ok || !data?.family) {
        setError(data?.error ?? "No se pudo crear la familia.");
        return;
      }
      const email = banqueroEmail.trim().toLowerCase();
      onCreated({
        id: data.family.id,
        name: data.family.name,
        banqueroName: banqueroName.trim(),
        banqueroEmail: email,
        myRole: email === selfEmail ? "banquero" : null,
      });
      setBanqueroName("");
      setBanqueroEmail("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl border border-line bg-white">
      <button type="button" onClick={() => setOpen(true)} className="flex h-full min-h-36 w-full items-center justify-center rounded-2xl px-3 py-4">
        <span className="rounded-full border border-foreground/15 bg-background px-6 py-2.5 font-serif text-xl shadow-sm">Nueva</span>
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-6" role="presentation" onClick={() => { if (!busy) setOpen(false); }}>
          <form
            onSubmit={onSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nueva-familia"
            className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="nueva-familia" className="font-serif text-3xl">Nueva familia</h2>
            <p className="mt-2 text-sm text-muted">Creas al banquero. Él le pone el nombre a su familia.</p>
            <div className="mt-5 grid gap-3">
              <Input label="Nombre del banquero" value={banqueroName} onChange={setBanqueroName} />
              <Input label="Correo del banquero" type="email" value={banqueroEmail} onChange={setBanqueroEmail} />
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <button disabled={busy} className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
                {busy ? "Creando…" : "Crear familia"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </li>
  );
}

type SectionId = "auditar" | "datos" | "ninos" | "rentabilidad" | "auditores" | "tips";

const SECTIONS: { id: SectionId; short: string }[] = [
  { id: "auditar", short: "Movimientos" },
  { id: "datos", short: "Datos" },
  { id: "ninos", short: "Niños" },
  { id: "rentabilidad", short: "Rentabilidad" },
  { id: "auditores", short: "Auditores" },
  { id: "tips", short: "Tips" },
];

function BanqueroPanel({
  family,
  children,
  auditors,
  tips,
  onFamilyRenamed,
  auditor = false,
}: {
  family: FamilyDetail;
  children: ChildItem[];
  auditors: AuditorItem[];
  tips: TipView[];
  onFamilyRenamed?: (name: string) => void;
  auditor?: boolean;
}) {
  const [open, setOpen] = useState<SectionId>("auditar");
  const [params, setParams] = useState(family);
  const [childRows, setChildRows] = useState(children);
  const [auditorRows, setAuditorRows] = useState(auditors);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [rentabilidadChildId, setRentabilidadChildId] = useState<string | null>(null);

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
      setError(data?.error ?? "No se pudieron guardar los parámetros.");
      return;
    }
    setMessage("Parámetros guardados.");
    onFamilyRenamed?.(params.name.trim());
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(auditor ? SECTIONS.filter((section) => section.id === "auditar" || section.id === "datos" || section.id === "ninos") : SECTIONS).map((section) => (
          <button
            key={section.id}
            type="button"
            aria-pressed={open === section.id}
            onClick={() => setOpen(section.id)}
            className={`min-w-0 rounded-2xl border px-3 py-2.5 text-center font-serif text-base leading-tight sm:text-lg ${open === section.id ? "border-accent bg-accent/10" : "border-line bg-white"}`}
          >
            {section.short}
          </button>
        ))}
      </div>
      {open === "auditar" ? <AuditPanel /> : null}
      {open === "datos" ? (
        <DatosPanel mode="open" readOnly={auditor} params={params} setParams={setParams} onSubmit={saveParams} error={error} message={message} />
      ) : null}
      {open === "ninos" ? (
        <Children
          mode="open"
          readOnly={auditor}
          rows={childRows}
          setRows={setChildRows}
          onOpenRentabilidad={
            auditor
              ? undefined
              : (childId) => {
                  setRentabilidadChildId(childId);
                  setOpen("rentabilidad");
                }
          }
        />
      ) : null}
      {!auditor ? (
        <FamilyRentabilidad
          visible={open === "rentabilidad"}
          initialChildId={rentabilidadChildId}
          onOpenSection={() => setOpen("rentabilidad")}
        />
      ) : null}
      {open === "auditores" ? <Auditors mode="open" rows={auditorRows} setRows={setAuditorRows} /> : null}
      {open === "tips" ? <FamilyTips mode="open" initialTips={tips} /> : null}
    </div>
  );
}

function AuditPanel() {
  return (
    <OpenCard id="auditar" title="Movimientos">
      <TaskReview />
    </OpenCard>
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

function OpenCard({ id, title, hint, children }: { id: SectionId; title: string; hint?: string; children: ReactNode }) {
  return (
    <section id={`panel-${id}`} className="scroll-mt-36 rounded-3xl border border-line bg-card p-5 sm:p-6">
      <h2 className="font-serif text-3xl">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MiniStat({ label, value, wide }: { label?: string; value: string; wide?: boolean }) {
  return (
    <span className={`rounded-2xl border border-line bg-white px-3 py-2 ${wide ? "col-span-2" : ""}`}>
      {label ? <span className="block text-xs text-muted">{label}</span> : null}
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
  label?: string;
  value: string;
  onClick: () => void;
  dashed?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-full w-full rounded-2xl border px-3 py-3 text-left hover:border-accent ${dashed ? "border-dashed border-accent/50 bg-white" : active ? "border-accent bg-accent/10" : "border-line bg-white"}`}
    >
      {label ? <span className="block truncate text-xs text-muted">{label}</span> : null}
      <span className="block truncate font-serif text-xl">{value}</span>
    </button>
  );
}

function DatosPanel({
  mode,
  readOnly = false,
  onToggle,
  params,
  setParams,
  onSubmit,
  error,
  message,
}: {
  mode: "preview" | "open";
  readOnly?: boolean;
  onToggle?: () => void;
  params: FamilyDetail;
  setParams: (params: FamilyDetail) => void;
  onSubmit: (event: FormEvent) => void;
  error: string;
  message: string;
}) {
  if (mode === "preview") {
    return (
      <PreviewCard title="Datos generales" onOpen={onToggle ?? (() => {})}>
        <MiniStat wide label="Familia" value={params.name || "Sin nombre"} />
        <MiniStat label="Inversión" value={`${params.pctInversion}%`} />
        <MiniStat label="Gasto" value={`${params.pctGasto}%`} />
        <MiniStat label="Generosidad" value={`${params.pctDonaciones}%`} />
        <MiniStat label="Tasa rent." value={`${params.interestPercent}%`} />
      </PreviewCard>
    );
  }

  if (readOnly) {
    return (
      <OpenCard id="datos" title="Datos generales">
        <div className="grid grid-cols-2 gap-2">
          <MiniStat wide label="Familia" value={params.name || "Sin nombre"} />
          <MiniStat label="Inversión" value={`${params.pctInversion}%`} />
          <MiniStat label="Gasto" value={`${params.pctGasto}%`} />
          <MiniStat label="Generosidad" value={`${params.pctDonaciones}%`} />
          <MiniStat label="Tasa rentabilidad" value={`${params.interestPercent}% mensual`} />
        </div>
      </OpenCard>
    );
  }

  return (
    <OpenCard id="datos" title="Datos generales">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Nombre de la familia" value={params.name} onChange={(value) => setParams({ ...params, name: value })} />
          <p className="mt-2 text-sm text-muted">El niño escribe este nombre para entrar. No puede repetirse.</p>
        </div>
        <Input label="Inversión %" type="number" value={String(params.pctInversion)} onChange={(value) => setParams({ ...params, pctInversion: Number(value) })} />
        <Input label="Gasto %" type="number" value={String(params.pctGasto)} onChange={(value) => setParams({ ...params, pctGasto: Number(value) })} />
        <Input label="Generosidad %" type="number" value={String(params.pctDonaciones)} onChange={(value) => setParams({ ...params, pctDonaciones: Number(value) })} />
        <div className="sm:col-span-2">
          <Input
            label="Tasa rentabilidad mensual %"
            type="number"
            value={String(params.interestPercent)}
            onChange={(value) => setParams({ ...params, interestPercent: Number(value) })}
          />
          <p className="mt-2 text-sm text-muted">Se aplica como tasa ÷ 30 sobre el saldo diario de Inversión.</p>
        </div>
        {error ? <p className="text-sm text-red-700 sm:col-span-2">{error}</p> : null}
        {message ? <p className="text-sm text-accent sm:col-span-2">{message}</p> : null}
        <button className="rounded-2xl bg-accent px-4 py-3 font-bold text-white sm:col-span-2">Guardar parámetros</button>
      </form>
    </OpenCard>
  );
}

function NewChild({ onCreated, onCancel }: { onCreated: (child: ChildItem) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loginId, setLoginId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isPin(pin)) return;
    setError("");
    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, birthDate, loginId, pin }),
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
        <Input label="Fecha de nacimiento" type="date" value={birthDate} onChange={setBirthDate} />
        <Input label="Nombre en la casa" value={loginId} onChange={setLoginId} />
        <PinField label="PIN de 6 números" value={pin} onChange={setPin} />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button disabled={!isPin(pin)} className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
          Crear niño
        </button>
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
    <p role="status" className="mihucha-toast fixed top-20 right-6 z-50 max-w-xs rounded-2xl border border-white/15 bg-foreground/60 px-4 py-3 text-sm font-bold text-background shadow-lg backdrop-blur-md">
      {message}
    </p>
  );
}

function Children({
  rows,
  setRows,
  mode,
  readOnly = false,
  onToggle,
  onOpenRentabilidad,
}: {
  rows: ChildItem[];
  setRows: (update: (rows: ChildItem[]) => ChildItem[]) => void;
  mode: "preview" | "open";
  readOnly?: boolean;
  onToggle?: () => void;
  onOpenRentabilidad?: (childId: string) => void;
}) {
  const [toast, setToast] = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const shown = rows.slice(0, 4);

  useEffect(() => {
    if (mode === "preview") setSelected(null);
  }, [mode]);

  if (mode === "preview") {
    return (
      <PreviewCard title="Niños" onOpen={onToggle ?? (() => {})}>
        {shown.map((child) => (
          <MiniStat key={child.id} wide={shown.length === 1} value={child.name} />
        ))}
        {rows.length > shown.length ? <MiniStat label="Más" value={`+${rows.length - shown.length}`} /> : null}
        {rows.length === 0 ? <span className="col-span-2 text-sm text-muted">Todavía no hay niños.</span> : null}
      </PreviewCard>
    );
  }

  return (
    <OpenCard id="ninos" title="Niños" hint={readOnly ? undefined : "Toca una tarjeta para verla en grande."}>
      <ul className="grid grid-cols-2 gap-2">
        {rows.length === 0 ? <li className="col-span-2 text-sm text-muted">Todavía no hay niños.</li> : null}
        {rows.map((child) => (
          <li key={child.id} className={selected === child.id ? "col-span-2" : "grid"}>
            {selected === child.id ? (
              <ChildCard
                child={child}
                readOnly={readOnly}
                onCollapse={() => setSelected(null)}
                onOpenRentabilidad={onOpenRentabilidad}
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
              <MiniButton value={child.name} onClick={() => setSelected(child.id)} />
            )}
          </li>
        ))}
        {readOnly ? null : (
          <li className={selected === "new" ? "col-span-2" : "grid"}>
            {selected === "new" ? (
              <NewChild
                onCancel={() => setSelected(null)}
                onCreated={(child) => {
                  setRows((current) => [...current, child]);
                  setSelected(child.id);
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-line bg-white px-3 py-3">
                <button type="button" onClick={() => setSelected("new")} className="rounded-full border border-foreground/15 bg-background px-6 py-2.5 font-serif text-xl shadow-sm">
                  Nuevo niño
                </button>
              </div>
            )}
          </li>
        )}
      </ul>
      <Notice message={toast} />
    </OpenCard>
  );
}

type ChildCartolaView = {
  pendingCount: number;
  pendingSum: number;
  withdrawalPendingCount: number;
  withdrawalPendingSum: number;
  wallets: {
    type: "inversion" | "gasto" | "donaciones";
    availableMinor: number;
    earned12mMinor: number;
    withdrawn12mMinor: number;
  }[];
};

const WALLET_LABELS = {
  inversion: "Inversión",
  gasto: "Gasto",
  donaciones: "Generosidad",
} as const;

function pesos(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`;
}

function ChildCartola({
  childId,
  onOpenRentabilidad,
}: {
  childId: string;
  onOpenRentabilidad?: (childId: string) => void;
}) {
  const [cartola, setCartola] = useState<ChildCartolaView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setCartola(null);
    setError("");
    fetch(`/api/children/${childId}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { cartola?: ChildCartolaView; error?: string } | null;
        if (!active) return;
        if (!res.ok || !data?.cartola) {
          setError(data?.error ?? "No se pudo cargar la cartola.");
          return;
        }
        setCartola(data.cartola);
      })
      .catch(() => {
        if (active) setError("No se pudo cargar la cartola.");
      });
    return () => {
      active = false;
    };
  }, [childId]);

  if (error) return <p className="mt-4 text-sm text-red-700">{error}</p>;
  if (!cartola) {
    return (
      <div className="mt-4 grid gap-2" aria-busy="true" aria-live="polite">
        <div className="h-14 animate-pulse rounded-2xl border border-line bg-background/80" />
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="h-36 animate-pulse rounded-2xl border border-line bg-background/80" />
          <div className="h-36 animate-pulse rounded-2xl border border-line bg-background/80" />
          <div className="h-36 animate-pulse rounded-2xl border border-line bg-background/80" />
        </div>
      </div>
    );
  }

  const tipLabel =
    cartola.pendingCount === 0 ? "Nada por revisar" : cartola.pendingCount === 1 ? "1 tip" : `${cartola.pendingCount} tips`;
  const cashLabel =
    cartola.withdrawalPendingCount === 0
      ? "Sin pedidos"
      : cartola.withdrawalPendingCount === 1
        ? "1 pedido"
        : `${cartola.withdrawalPendingCount} pedidos`;

  return (
    <div className="mt-4 grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-line bg-background/70 px-3 py-3">
          <p className="text-xs text-muted">Tips pendientes</p>
          <p className="mt-1 font-serif text-2xl leading-none">{pesos(cartola.pendingSum)}</p>
          <p className="mt-1.5 text-xs font-bold text-muted">{tipLabel}</p>
        </div>
        <div className="rounded-2xl border border-line bg-background/70 px-3 py-3">
          <p className="text-xs text-muted">Por entregar</p>
          <p className="mt-1 font-serif text-2xl leading-none">{pesos(cartola.withdrawalPendingSum)}</p>
          <p className="mt-1.5 text-xs font-bold text-muted">{cashLabel}</p>
        </div>
      </div>
      <ul className="grid gap-2 sm:grid-cols-3">
        {cartola.wallets.map((wallet) => (
          <li key={wallet.type} className="rounded-2xl border border-line bg-white px-3 py-3">
            <p className="text-xs font-bold text-accent">{WALLET_LABELS[wallet.type]}</p>
            <p className="mt-2 text-[11px] text-muted">Disponible</p>
            <p className="font-serif text-3xl leading-none">{pesos(wallet.availableMinor)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line/80 pt-3">
              <div>
                <p className="text-[11px] text-muted">{wallet.type === "inversion" ? "Intereses 12 m" : "Ganado 12 m"}</p>
                <p className="font-serif text-lg leading-none">{pesos(wallet.earned12mMinor)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted">Retiros 12 m</p>
                <p className="font-serif text-lg leading-none">{pesos(wallet.withdrawn12mMinor)}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {onOpenRentabilidad ? (
        <button
          type="button"
          onClick={() => onOpenRentabilidad(childId)}
          className="rounded-2xl border border-accent/40 bg-accent/5 px-4 py-3 text-sm font-bold text-accent"
        >
          Ver rentabilidad
        </button>
      ) : null}
    </div>
  );
}

function ChildCard({
  child,
  readOnly = false,
  onSaved,
  onRemoved,
  onCollapse,
  onOpenRentabilidad,
}: {
  child: ChildItem;
  readOnly?: boolean;
  onSaved: (child: ChildItem) => void;
  onRemoved: (name: string) => void;
  onCollapse: () => void;
  onOpenRentabilidad?: (childId: string) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "baja">("view");
  const [name, setName] = useState(child.name);
  const [birthDate, setBirthDate] = useState(child.birthDate);
  const [loginId, setLoginId] = useState(child.loginId);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const born = birthLabel(child.birthDate);

  function beginEdit() {
    setName(child.name);
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

  const pinChangeOk = pin.length === 0 || isPin(pin);

  async function save() {
    if (!pinChangeOk) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/children/${child.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, birthDate, loginId, pin }),
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
          <Input label="Fecha de nacimiento" type="date" value={birthDate} onChange={setBirthDate} />
          <Input label="Nombre en la casa" value={loginId} onChange={setLoginId} />
          <PinField label="PIN nuevo, si lo cambias" value={pin} onChange={setPin} />
        </div>
      ) : (
        <>
          <p className="font-serif text-2xl">{child.name}</p>
          <p className="mt-3 text-sm">
            En casa, <span className="font-bold">{child.loginId}</span>
          </p>
          {born ? <p className="mt-1 text-sm text-muted">{born}</p> : null}
          {mode === "view" ? (
            <ChildCartola childId={child.id} onOpenRentabilidad={readOnly ? undefined : onOpenRentabilidad} />
          ) : null}
        </>
      )}
      {mode === "baja" ? <p className="mt-3 text-sm">{child.name} deja de poder entrar. Su libro se queda.</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {readOnly ? null : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {mode === "edit" ? (
            <>
              <button type="button" disabled={busy || !pinChangeOk} onClick={save} className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
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
      )}
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
  onToggle?: () => void;
}) {
  const [toast, setToast] = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const shown = rows.slice(0, 4);

  useEffect(() => {
    if (mode === "preview") setSelected(null);
  }, [mode]);

  if (mode === "preview") {
    return (
      <PreviewCard title="Auditores" onOpen={onToggle ?? (() => {})}>
        {shown.map((auditor) => (
          <MiniStat key={auditor.id} wide={shown.length === 1} label={auditor.email} value={auditor.name} />
        ))}
        {rows.length > shown.length ? <MiniStat label="Más" value={`+${rows.length - shown.length}`} /> : null}
        {rows.length === 0 ? <span className="col-span-2 text-sm text-muted">Todavía no hay auditores.</span> : null}
      </PreviewCard>
    );
  }

  return (
    <OpenCard id="auditores" title="Auditores" hint="Toca una tarjeta para verla en grande.">
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
