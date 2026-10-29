"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { dayLabel } from "@/lib/santiago-date";
import type { TaskView } from "@/lib/tip-cycle";

const WEEK = ["L", "M", "X", "J", "V", "S", "D"];

function pesos(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`;
}

function monthCells(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const pad = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<string | null> = Array.from({ length: pad }, () => null);
  for (let day = 1; day <= count; day += 1) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  return cells;
}

function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function monthTitle(year: number, month: number) {
  const title = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function shortDate(iso: string) {
  const [, month, day] = iso.split("-");
  return `${day}-${month}`;
}

function monthsAroundToday(today: string) {
  const [year, month, day] = today.split("-").map(Number);
  const current = { year, month };
  if (day < 15) return [shiftMonth(year, month, -1), current];
  return [current, shiftMonth(year, month, 1)];
}

export function DayCalendar({ today, selected, oldest }: { today: string; selected: string; oldest: string }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const months = monthsAroundToday(today);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-3xl">{selected === today ? `Hoy ${shortDate(today)}` : shortDate(selected)}</h2>
        <div className="flex items-center gap-3">
          {selected !== today ? (
            <a href="/yo" className="text-sm font-bold text-accent">
              Volver a hoy
            </a>
          ) : null}
          <button type="button" className="rounded-2xl border border-line bg-card px-4 py-2 font-bold" onClick={() => setOpen(true)}>
            otro día
          </button>
        </div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-4" role="presentation" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl bg-card p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id={titleId} className="font-serif text-3xl">
                Elige el día
              </h2>
              <button type="button" className="rounded-2xl border border-line px-4 py-2 font-bold" onClick={() => setOpen(false)}>
                Cerrar
              </button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-6">
              {months.map((month) => (
                <MonthGrid key={`${month.year}-${month.month}`} year={month.year} month={month.month} today={today} selected={selected} oldest={oldest} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MonthGrid({
  year,
  month,
  today,
  selected,
  oldest,
}: {
  year: number;
  month: number;
  today: string;
  selected: string;
  oldest: string;
}) {
  const cells = monthCells(year, month);
  return (
    <div>
      <p className="font-serif text-2xl">{monthTitle(year, month)}</p>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-sm">
        {WEEK.map((label, index) => (
          <span key={`${label}-${index}`} className="py-1 text-xs font-bold text-muted">
            {label}
          </span>
        ))}
        {cells.map((iso, index) => {
          if (!iso) return <span key={`empty-${index}`} />;
          const blocked = iso > today || iso < oldest;
          const current = iso === selected;
          const className = `grid h-9 place-items-center rounded-2xl font-bold ${
            current ? "bg-accent text-white" : blocked ? "text-muted/40" : "hover:bg-accent/10"
          }`;
          if (blocked) {
            return (
              <span key={iso} className={className}>
                {Number(iso.slice(-2))}
              </span>
            );
          }
          return (
            <a key={iso} href={iso === today ? "/yo" : `/yo?dia=${iso}`} className={className} aria-current={current ? "date" : undefined}>
              {Number(iso.slice(-2))}
            </a>
          );
        })}
      </div>
    </div>
  );
}

export function TaskCart({ date, today, tasks }: { date: string; today: string; tasks: TaskView[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const openIds = new Set(tasks.filter((task) => task.status === "available" || task.status === "needs_improvement").map((task) => task.id));

  function toggle(id: string) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/tip-occurrences/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, ids: picked }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo confirmar el día.");
        return;
      }
      setPicked([]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="font-serif text-3xl">{dayLabel(date, today)}</h2>
      <p className="mt-1 text-sm text-muted">Marca lo que hiciste y confirma el día.</p>
      {tasks.length === 0 ? <p className="mt-4 text-muted">Este día no tiene tareas.</p> : null}
      <ul className="mt-4 grid gap-2">
        {tasks.map((task) => {
          const open = openIds.has(task.id);
          const checked = open ? picked.includes(task.id) : task.status !== "needs_improvement";
          const note = task.status === "needs_improvement" ? task.reviewNote : "";
          return (
            <li key={task.id}>
              {open ? (
                <button
                  type="button"
                  aria-pressed={checked}
                  onClick={() => toggle(task.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left ${checked ? "border-accent bg-accent/10" : "border-line bg-card"}`}
                >
                  <span className={`grid size-7 shrink-0 place-items-center rounded-lg border font-bold ${checked ? "border-accent bg-accent text-white" : "border-line bg-white"}`}>
                    {checked ? "✓" : ""}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{task.title}</span>
                    {note ? <span className="mt-1 block text-sm text-red-700">{note}</span> : null}
                  </span>
                  <span className="text-sm font-bold">Tip {pesos(task.amountMinor)}</span>
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-line bg-white text-sm font-bold text-accent">
                    {task.status === "rejected" ? "–" : "✓"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{task.title}</span>
                    <span className="mt-1 block text-sm text-muted">{statusLabel(task)}</span>
                  </span>
                  <span className="text-sm font-bold">Tip {pesos(task.amountMinor)}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        disabled={busy || picked.length === 0}
        onClick={confirm}
        className="mt-4 w-full rounded-2xl bg-accent py-3 font-bold text-white disabled:opacity-50"
      >
        {busy ? "Enviando…" : "Confirmar este día"}
      </button>
    </section>
  );
}

function statusLabel(task: TaskView) {
  if (task.status === "submitted") return "En revisión";
  if (task.status === "approved") return "Tip recibido";
  if (task.status === "rejected") return task.reviewNote || "No quedó hecha";
  return task.reviewNote || "Puede mejorar";
}
