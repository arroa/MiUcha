"use client";

import { useEffect, useState, type FormEvent } from "react";

import { TIP_CATALOG } from "@/lib/tip-catalog";
import type { TipView } from "@/lib/tips";

type Row = { key: string; title: string; amount: string; active: boolean; editing: boolean };

function rowsFromTips(initialTips: TipView[]): Row[] {
  const saved = new Map(initialTips.filter((tip) => tip.catalogKey).map((tip) => [tip.catalogKey as string, tip]));
  const catalog = TIP_CATALOG.filter((task) => !saved.get(task.key)?.hidden).map((task) => {
    const tip = saved.get(task.key);
    return {
      key: task.key,
      title: tip?.title || task.title,
      amount: String(tip?.amountMinor ?? task.suggestedMinor),
      active: Boolean(tip?.active),
      editing: false,
    };
  });
  const custom = initialTips
    .filter((tip) => tip.catalogKey?.startsWith("custom-") && !tip.hidden)
    .slice()
    .reverse()
    .map((tip) => ({
      key: tip.catalogKey as string,
      title: tip.title,
      amount: String(tip.amountMinor),
      active: tip.active,
      editing: false,
    }));
  return [...catalog, ...custom];
}

export function FamilyTips({ initialTips, mode, onToggle }: { initialTips: TipView[]; mode: "preview" | "open"; onToggle?: () => void }) {
  const [rows, setRows] = useState<Row[]>(() => rowsFromTips(initialTips));
  const [picked, setPicked] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAmount, setDraftAmount] = useState("500");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<Row | null>(null);

  useEffect(() => {
    if (mode === "preview") setPicked(null);
  }, [mode]);

  useEffect(() => {
    if (!confirming || busy) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirming(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming, busy]);

  function update(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function toggleActive(row: Row, active: boolean) {
    if (row.editing) {
      update(row.key, { active });
      return;
    }
    const previous = row.active;
    update(row.key, { active });
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/tips", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ key: row.key, title: row.title, amountMinor: Number(row.amount), active }],
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; tips?: TipView[] } | null;
      const tips = data?.tips;
      if (!res.ok || !tips) {
        update(row.key, { active: previous });
        setError(data?.error ?? "No se pudo guardar la tarea.");
        return;
      }
      setRows((current) => (current.some((item) => item.editing) ? current : rowsFromTips(tips)));
    } finally {
      setBusy(false);
    }
  }

  function edit(key: string) {
    setError("");
    setMessage("");
    setRows((current) => current.map((row) => ({ ...row, editing: row.key === key })));
  }

  async function finish(row: Row) {
    const title = row.title.trim();
    const amount = Number(row.amount);
    if (!title || title.length > 80) {
      setError("La tarea necesita un nombre de hasta 80 caracteres.");
      return;
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      setError(`Ponle un precio en pesos a ${title}.`);
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/tips", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ key: row.key, title, amountMinor: amount, active: row.active }],
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; tips?: TipView[] } | null;
      if (!res.ok || !data?.tips) {
        setError(data?.error ?? "No se pudo guardar la tarea.");
        return;
      }
      setRows(rowsFromTips(data.tips));
      setMessage("Tarea guardada.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Row) {
    setError("");
    setMessage("");
    if (row.key.startsWith("new-")) {
      setRows((current) => current.filter((item) => item.key !== row.key));
      setConfirming(null);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/tips/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: row.key }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo eliminar la tarea.");
        return;
      }
      setRows((current) => current.filter((item) => item.key !== row.key));
      setConfirming(null);
      setMessage("Tarea eliminada.");
    } finally {
      setBusy(false);
    }
  }

  async function addTask(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom: true, title: draftTitle, amountMinor: Number(draftAmount) }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; tip?: TipView } | null;
      if (!res.ok || !data?.tip?.catalogKey) {
        setError(data?.error ?? "No se pudo agregar la tarea.");
        return;
      }
      const tip = data.tip;
      setRows((current) => [
        ...current,
        { key: tip.catalogKey as string, title: tip.title, amount: String(tip.amountMinor), active: true, editing: false },
      ]);
      setDraftTitle("");
      setDraftAmount("500");
      setMessage("Tarea agregada.");
    } finally {
      setBusy(false);
    }
  }

  const activeCount = rows.filter((row) => row.active).length;
  const previewRows = (activeCount ? rows.filter((row) => row.active) : rows).slice(0, 4);
  const hiddenCount = rows.length - previewRows.length;

  if (mode === "preview") {
    return (
      <button type="button" onClick={onToggle ?? (() => {})} className="flex h-full w-full flex-col rounded-3xl border border-line bg-card p-4 text-left hover:border-accent">
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-serif text-2xl">Tips</span>
          <span className="text-sm font-bold text-accent">Abrir</span>
        </span>
        <span className="mt-3 grid grid-cols-2 gap-2">
          {previewRows.map((row) => (
            <span key={row.key} className={`rounded-2xl border px-3 py-2 ${row.active ? "border-accent bg-accent/10" : "border-line bg-white"} ${previewRows.length === 1 ? "col-span-2" : ""}`}>
              <span className="block truncate text-xs text-muted">{row.active ? "Activa" : "Precio"}</span>
              <span className="block truncate font-bold">{row.title}</span>
              <span className="text-sm text-muted">${Number(row.amount || 0).toLocaleString("es-CL")}</span>
            </span>
          ))}
          {hiddenCount > 0 ? (
            <span className="rounded-2xl border border-line bg-white px-3 py-2">
              <span className="block text-xs text-muted">Más</span>
              <span className="block font-bold">+{hiddenCount}</span>
            </span>
          ) : null}
          {rows.length === 0 ? <span className="col-span-2 text-sm text-muted">Todavía no hay tareas.</span> : null}
        </span>
      </button>
    );
  }

  return (
    <section id="panel-tips" className="scroll-mt-36 rounded-3xl border border-line bg-card p-5 sm:p-6">
      <h2 className="font-serif text-3xl">Tips</h2>
      <p className="mt-1 text-sm text-muted">{activeCount === 1 ? "1 activa" : `${activeCount} activas`}.</p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
      <ul className="mt-4 grid grid-cols-2 gap-2">
        <li>
          {picked === "new" ? (
            <form onSubmit={addTask} className="grid gap-3 rounded-2xl border border-accent bg-white p-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-serif text-xl">Nueva tarea</p>
                <button type="button" onClick={() => setPicked(null)} className="text-sm font-bold text-muted">
                  Cerrar
                </button>
              </div>
              <label className="text-sm">
                Nombre
                <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2" />
              </label>
              <label className="text-sm">
                Valor
                <span className="mt-1.5 flex items-center rounded-xl border border-line bg-white px-3">
                  <span className="text-muted">$</span>
                  <input type="number" min={1} value={draftAmount} onChange={(event) => setDraftAmount(event.target.value)} className="w-full bg-transparent px-2 py-2 outline-none" />
                </span>
              </label>
              <button disabled={busy} className="rounded-xl border border-accent px-3 py-2 font-bold text-accent disabled:opacity-50">
                Agregar tarea
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setPicked("new")} className="h-full w-full rounded-2xl border border-dashed border-accent/50 bg-white px-3 py-3 text-left hover:border-accent">
              <span className="block text-xs text-muted">Sumar</span>
              <span className="block font-serif text-xl">Nueva tarea</span>
            </button>
          )}
        </li>
        {rows.map((row) => (
          <li key={row.key}>
            <article className={`rounded-2xl border p-2.5 ${row.active ? "border-accent bg-accent/10" : "border-line bg-white"}`}>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={row.active}
                    disabled={busy}
                    onChange={(event) => toggleActive(row, event.target.checked)}
                    className="size-5 accent-accent disabled:opacity-100"
                  />
                  Activa
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => (row.editing ? finish(row) : edit(row.key))}
                    className="rounded-xl border border-foreground/20 bg-white px-2.5 py-1 text-sm font-bold disabled:opacity-50"
                  >
                    {row.editing ? "Listo" : "Editar"}
                  </button>
                  <button type="button" disabled={busy} className="rounded-xl px-2.5 py-1 text-sm font-bold text-red-800 disabled:opacity-50" onClick={() => setConfirming(row)}>
                    Eliminar
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-start justify-between gap-3">
                {row.editing ? (
                  <input
                    value={row.title}
                    onChange={(event) => update(row.key, { title: event.target.value })}
                    className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-1.5 font-bold"
                  />
                ) : (
                  <p className="min-w-0 font-serif text-lg leading-tight">{row.title}</p>
                )}
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-muted">Valor</p>
                  {row.editing ? (
                    <span className="mt-1 flex w-24 items-center rounded-xl border border-line bg-white px-2">
                      <span className="text-muted">$</span>
                      <input
                        type="number"
                        min={1}
                        value={row.amount}
                        onChange={(event) => update(row.key, { amount: event.target.value })}
                        className="w-full bg-transparent px-1 py-1 text-right outline-none"
                      />
                    </span>
                  ) : (
                    <p className="text-sm font-bold">${Number(row.amount || 0).toLocaleString("es-CL")}</p>
                  )}
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-6" role="presentation" onClick={() => { if (!busy) setConfirming(null); }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="eliminar-tarea"
            className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="eliminar-tarea" className="font-serif text-3xl">
              ¿Eliminar {confirming.title}?
            </h2>
            <p className="mt-3">Deja de aparecer en la lista.</p>
            {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => remove(confirming)} className="rounded-2xl bg-red-800 px-4 py-3 font-bold text-white disabled:opacity-50">
                {busy ? "Eliminando…" : "Eliminar"}
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirming(null)} className="rounded-2xl border border-foreground/20 px-4 py-3 font-bold disabled:opacity-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
