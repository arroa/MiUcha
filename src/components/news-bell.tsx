"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export type NewsItem = {
  id: string;
  when: string;
  text: string;
  read: boolean;
};

export function NewsBell({ items }: { items: NewsItem[] }) {
  const router = useRouter();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(items);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const unread = rows.filter((item) => !item.read).length;

  useEffect(() => {
    setRows(items);
  }, [items]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function act(id: string, action: "read" | "dismiss") {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/tip-occurrences/${id}/news`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo actualizar el aviso.");
        return;
      }
      setRows((current) => (action === "dismiss" ? current.filter((item) => item.id !== id) : current.map((item) => (item.id === id ? { ...item, read: true } : item))));
      router.refresh();
    } finally {
      setBusyId("");
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unread > 0 ? `Novedades, ${unread} sin leer` : "Novedades"}
        onClick={() => setOpen((current) => !current)}
        className="relative grid size-12 place-items-center rounded-2xl border border-line bg-card"
      >
        <BellIcon />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div id={panelId} className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-3rem))] rounded-3xl border border-line bg-card p-3 shadow-lg">
          <p className="px-2 py-1 font-serif text-2xl">Novedades</p>
          {rows.length === 0 ? <p className="px-2 py-3 text-sm text-muted">Cuando revisen tus tareas, el resultado aparece aquí.</p> : null}
          <ul className="grid max-h-80 gap-2 overflow-auto">
            {rows.map((item) => (
              <li key={item.id} className="rounded-2xl border border-line bg-white px-3 py-3">
                <div className="flex gap-2">
                  {item.read ? <span className="mt-1 size-2 shrink-0 rounded-full bg-line" /> : <span className="mt-1 size-2 shrink-0 rounded-full bg-accent" />}
                  <div className="min-w-0">
                    <p className="text-sm capitalize text-muted">{item.when}</p>
                    <p className={item.read ? "text-sm" : "text-sm font-bold"}>{item.text}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-3">
                  {item.read ? (
                    <span className="text-sm font-bold text-accent">Leída</span>
                  ) : (
                    <button type="button" disabled={busyId === item.id} onClick={() => act(item.id, "read")} className="text-sm font-bold text-accent disabled:opacity-50">
                      Marcar leída
                    </button>
                  )}
                  <button type="button" disabled={busyId === item.id} onClick={() => act(item.id, "dismiss")} className="text-sm font-bold text-red-800 disabled:opacity-50">
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {error ? <p className="px-2 pt-2 text-sm text-red-700">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
      <path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
