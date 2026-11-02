"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { dispatchArreglarTip } from "@/lib/child-events";

export type NewsItem = {
  id: string;
  kind: "tip" | "interest";
  when: string;
  text: string;
  read: boolean;
  canRetry?: boolean;
};

export function NewsBell({ items }: { items: NewsItem[] }) {
  const router = useRouter();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [showRead, setShowRead] = useState(false);
  const [rows, setRows] = useState(items);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const unread = useMemo(() => rows.filter((item) => !item.read), [rows]);
  const read = useMemo(() => rows.filter((item) => item.read), [rows]);
  const visible = showRead ? rows : unread;

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

  async function act(id: string, kind: NewsItem["kind"], action: "read" | "dismiss", opts?: { refresh?: boolean }) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/child-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, kind, action }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo actualizar el aviso.");
        return;
      }
      setRows((current) =>
        action === "dismiss"
          ? current.filter((item) => item.id !== id)
          : current.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
      if (opts?.refresh !== false) router.refresh();
    } finally {
      setBusyId("");
    }
  }

  return (
    <div ref={rootRef} className={`relative ${open ? "z-50" : ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        title="Tips e intereses nuevos. Las leídas se ocultan."
        aria-label={unread.length > 0 ? `Novedades, ${unread.length} sin leer` : "Novedades"}
        onClick={() => setOpen((current) => !current)}
        className="relative grid size-11 place-items-center rounded-full border border-line bg-card shadow-sm"
      >
        <Bell className="size-5 text-accent" aria-hidden />
        {unread.length > 0 ? (
          <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-[#ff5a7a] px-1 text-xs font-bold text-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div id={panelId} className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-3rem))] rounded-3xl border border-line bg-card p-3 shadow-lg">
          <div className="flex items-start justify-between gap-2 px-2 py-1">
            <p className="text-xl font-extrabold">Novedades</p>
            {read.length > 0 ? (
              <button
                type="button"
                title={showRead ? "Ocultar las novedades ya leídas" : "Mostrar hasta 10 novedades leídas recientes"}
                aria-pressed={showRead}
                onClick={() => setShowRead((current) => !current)}
                className="shrink-0 text-sm font-bold text-accent"
              >
                {showRead ? "Ocultar leídas" : "Ver leídas"}
              </button>
            ) : null}
          </div>

          {visible.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted">
              {rows.length === 0
                ? "Cuando haya tips o intereses, aparecen aquí."
                : showRead
                  ? "No hay novedades para mostrar."
                  : "No tienes novedades sin leer."}
            </p>
          ) : null}

          <ul className="grid max-h-80 gap-2 overflow-auto">
            {visible.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="rounded-2xl border border-line bg-white px-3 py-3">
                <div className="flex gap-2">
                  {item.read ? <span className="mt-1 size-2 shrink-0 rounded-full bg-line" /> : <span className="mt-1 size-2 shrink-0 rounded-full bg-accent" />}
                  <div className="min-w-0">
                    <p className="text-sm capitalize text-muted">{item.when}</p>
                    <p className={item.read ? "text-sm" : "text-sm font-bold"}>{item.text}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
                  {item.canRetry ? (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => {
                        setOpen(false);
                        dispatchArreglarTip(item.id);
                        document.getElementById("mis-tips")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        void act(item.id, item.kind, "read", { refresh: false });
                      }}
                      className="rounded-xl bg-accent px-3 py-1.5 text-sm font-extrabold text-white disabled:opacity-50"
                    >
                      Lo arreglé
                    </button>
                  ) : null}
                  {item.read ? (
                    <span className="text-sm font-bold text-accent">Leída</span>
                  ) : (
                    <button type="button" disabled={busyId === item.id} onClick={() => act(item.id, item.kind, "read")} className="text-sm font-bold text-accent disabled:opacity-50">
                      Marcar leída
                    </button>
                  )}
                  <button type="button" disabled={busyId === item.id} onClick={() => act(item.id, item.kind, "dismiss")} className="text-sm font-bold text-red-800 disabled:opacity-50">
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
