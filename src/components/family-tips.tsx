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

export function FamilyTips({ initialTips, mode, onToggle }: { initialTips: TipView[]; mode: "preview" | "open"; onToggle: () => void }) {
  const [rows, setRows] = useState<Row[]>(() => rowsFromTips(initialTips));
  const [picked, setPicked] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAmount, setDraftAmount] = useState("500");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode === "preview") setPicked(null);
  }, [mode]);

  function update(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function save(nextRows: Row[]) {
    const res = await fetch("/api/tips", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: nextRows.map((row) => ({
          key: row.key,
          title: row.title,
          amountMinor: Number(row.amount),
          active: row.active,
        })),
      }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string; tips?: TipView[] } | null;
    if (!res.ok || !data?.tips) {
      setError(data?.error ?? "No se pudieron guardar los Tips.");
      return false;
    }
    setRows(rowsFromTips(data.tips).map((row) => ({ ...row, editing: false })));
    setMessage("Tips guardados.");
    return true;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await save(rows);
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Row) {
    setError("");
    setMessage("");
    if (row.key.startsWith("new-")) {
      setRows((current) => current.filter((item) => item.key !== row.key));
      return;
    }
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
      <button type="button" onClick={onToggle} className="flex h-full w-full flex-col rounded-3xl border border-line bg-card p-4 text-left hover:border-accent">
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
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-3xl">Tips</h2>
        <button type="button" onClick={onToggle} className="rounded-xl px-3 py-2 text-sm font-bold text-muted">
          Cerrar
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">Toca una tarjeta para verla en grande. {activeCount === 1 ? "1 activa" : `${activeCount} activas`}.</p>
      <ul className="mt-4 grid grid-cols-2 gap-2">
        <li className="col-span-2">
          {picked === "new" ? (
            <form onSubmit={addTask} className="grid gap-3 rounded-2xl border border-accent bg-white p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-serif text-2xl">Nueva tarea</p>
                <button type="button" onClick={() => setPicked(null)} className="text-sm font-bold text-muted">
                  Cerrar
                </button>
              </div>
              <label className="text-sm">
                Nombre
                <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} className="mt-1.5 w-full rounded-2xl border border-line bg-white px-4 py-3" />
              </label>
              <label className="text-sm">
                Precio
                <span className="mt-1.5 flex items-center rounded-2xl border border-line bg-white px-3">
                  <span className="text-muted">$</span>
                  <input type="number" min={1} value={draftAmount} onChange={(event) => setDraftAmount(event.target.value)} className="w-full bg-transparent px-2 py-2 outline-none" />
                </span>
              </label>
              <button disabled={busy} className="rounded-2xl border border-accent px-4 py-3 font-bold text-accent disabled:opacity-50">
                Agregar tarea
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setPicked("new")} className="w-full rounded-2xl border border-dashed border-accent/50 bg-white px-3 py-3 text-left hover:border-accent">
              <span className="block text-xs text-muted">Sumar</span>
              <span className="block font-serif text-xl">Nueva tarea</span>
            </button>
          )}
        </li>
        {rows.map((row) => (
          <li key={row.key} className={picked === row.key ? "col-span-2" : ""}>
            {picked === row.key ? (
              <div className={`grid gap-3 rounded-2xl border p-4 ${row.active ? "border-accent bg-accent/10" : "border-accent bg-white"}`}>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setPicked(null)} className="text-sm font-bold text-muted">
                    Cerrar
                  </button>
                </div>
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={row.active} onChange={(event) => update(row.key, { active: event.target.checked })} className="size-5 accent-accent" />
                  {row.editing ? (
                    <input value={row.title} onChange={(event) => update(row.key, { title: event.target.value })} className="w-full rounded-xl border border-line bg-white px-3 py-2 font-bold" />
                  ) : (
                    <span className="font-bold">{row.title}</span>
                  )}
                </label>
                <span className="text-sm">
                  Precio
                  <span className="mt-1.5 flex items-center rounded-2xl border border-line bg-white px-3">
                    <span className="text-muted">$</span>
                    <input type="number" min={1} value={row.amount} onChange={(event) => update(row.key, { amount: event.target.value })} className="w-full bg-transparent px-2 py-2 outline-none" />
                  </span>
                </span>
                <span className="flex gap-2">
                  <button type="button" className="rounded-xl border border-foreground/20 px-3 py-2 text-sm font-bold" onClick={() => update(row.key, { editing: !row.editing })}>
                    {row.editing ? "Listo" : "Editar"}
                  </button>
                  <button type="button" className="rounded-xl border border-red-800/30 px-3 py-2 text-sm font-bold text-red-800" onClick={() => remove(row)}>
                    Eliminar
                  </button>
                </span>
              </div>
            ) : (
              <button type="button" onClick={() => setPicked(row.key)} className={`w-full rounded-2xl border px-3 py-3 text-left hover:border-accent ${row.active ? "border-accent bg-accent/10" : "border-line bg-white"}`}>
                <span className="block truncate text-xs text-muted">{row.active ? "Activa" : "Precio"}</span>
                <span className="block truncate font-serif text-xl">{row.title}</span>
                <span className="text-sm text-muted">${Number(row.amount || 0).toLocaleString("es-CL")}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="mt-4">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {message ? <p className="text-sm text-accent">{message}</p> : null}
        <button disabled={busy} className="mt-3 w-full rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
          {busy ? "Guardando…" : "Guardar Tips"}
        </button>
      </form>
    </section>
  );
}
