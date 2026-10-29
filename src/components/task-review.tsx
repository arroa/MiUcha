"use client";

import { useEffect, useState } from "react";

import { dayLabel, santiagoToday } from "@/lib/santiago-date";
import type { TaskView } from "@/lib/tip-cycle";

function pesos(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`;
}

type Decision = "approved" | "needs_improvement" | "rejected";

export function TaskReview() {
  const [rows, setRows] = useState<TaskView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const today = santiagoToday().date;

  useEffect(() => {
    let active = true;
    fetch("/api/tip-occurrences?queue=review")
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { tasks?: TaskView[]; error?: string } | null;
        if (!active) return;
        if (!res.ok) {
          setError(data?.error ?? "No se pudieron cargar las tareas.");
          return;
        }
        setRows(data?.tasks ?? []);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function review(id: string, decision: Decision, note = "") {
    setError("");
    const res = await fetch(`/api/tip-occurrences/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "No se pudo revisar la tarea.");
      return;
    }
    setRows((current) => current.filter((row) => row.id !== id));
  }

  const groups: { date: string; tasks: TaskView[] }[] = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (last?.date === row.occurrenceDate) last.tasks.push(row);
    else groups.push({ date: row.occurrenceDate, tasks: [row] });
  }

  return (
    <div className="grid gap-6">
      {rows.length === 0 ? <p className="text-sm text-muted">{loaded ? "No hay tareas por revisar." : "Cargando…"}</p> : null}
      {groups.map((group) => (
        <section key={group.date} className="grid gap-3">
          <h3 className="font-serif text-2xl capitalize">{dayLabel(group.date, today)}</h3>
          {group.tasks.map((task) => (
            <ReviewCard key={task.id} task={task} onReview={review} />
          ))}
        </section>
      ))}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

function ReviewCard({
  task,
  onReview,
}: {
  task: TaskView;
  onReview: (id: string, decision: Decision, note?: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function decide(decision: Decision) {
    setBusy(true);
    await onReview(task.id, decision, note);
    setBusy(false);
  }

  return (
    <article className="rounded-2xl border border-line bg-white p-4">
      <p className="text-sm text-muted">{task.childName}</p>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <p className="font-serif text-2xl">{task.title}</p>
        <p className="font-bold">Tip {pesos(task.amountMinor)}</p>
      </div>
      <label className="mt-4 block text-sm">
        Comentario
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          className="mt-1.5 w-full rounded-2xl border border-line px-4 py-3"
          placeholder="Para una mejora, cuéntale qué puede hacer mejor."
        />
      </label>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <button type="button" disabled={busy} onClick={() => decide("approved")} className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
          Hecha
        </button>
        <button type="button" disabled={busy} onClick={() => decide("needs_improvement")} className="rounded-2xl border border-line px-4 py-3 font-bold disabled:opacity-50">
          Mejorable
        </button>
        <button type="button" disabled={busy} onClick={() => decide("rejected")} className="rounded-2xl border border-line px-4 py-3 font-bold text-red-800 disabled:opacity-50">
          No hecha
        </button>
      </div>
    </article>
  );
}
