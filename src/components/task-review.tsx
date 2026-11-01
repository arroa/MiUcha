"use client";

import { useEffect, useState } from "react";

import { dayLabel, santiagoToday } from "@/lib/santiago-date";
import type { TaskView } from "@/lib/tip-cycle";
import type { WithdrawalView } from "@/lib/money";

function pesos(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`;
}

const WALLET_LABELS = {
  inversion: "Inversión",
  gasto: "Gasto",
  donaciones: "Generosidad",
} as const;

type Decision = "approved" | "needs_improvement" | "rejected";

const HISTORY: Record<Exclude<TaskView["status"], "available" | "submitted">, { label: string; chip: string }> = {
  approved: { label: "Tip recibido", chip: "bg-accent/10 text-accent" },
  needs_improvement: { label: "Mejorable", chip: "bg-amber-50 text-amber-950" },
  rejected: { label: "No hecha", chip: "bg-red-50 text-red-800" },
};

function groupByDate(rows: TaskView[], today: string) {
  const groups: { date: string; label: string; tasks: TaskView[] }[] = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (last?.date === row.occurrenceDate) last.tasks.push(row);
    else groups.push({ date: row.occurrenceDate, label: dayLabel(row.occurrenceDate, today), tasks: [row] });
  }
  return groups;
}

export function TaskReview() {
  const [rows, setRows] = useState<TaskView[]>([]);
  const [history, setHistory] = useState<TaskView[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalView[]>([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalView[]>([]);
  const [canDeliver, setCanDeliver] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const today = santiagoToday().date;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/tip-occurrences?queue=review").then(async (res) => ({ res, data: await res.json().catch(() => null) })),
      fetch("/api/tip-occurrences?queue=history").then(async (res) => ({ res, data: await res.json().catch(() => null) })),
      fetch("/api/withdrawals").then(async (res) => ({ res, data: await res.json().catch(() => null) })),
      fetch("/api/withdrawals?queue=history").then(async (res) => ({ res, data: await res.json().catch(() => null) })),
    ])
      .then(([pending, past, cash, cashPast]) => {
        if (!active) return;
        const pendingData = pending.data as { tasks?: TaskView[]; error?: string } | null;
        const pastData = past.data as { tasks?: TaskView[]; error?: string } | null;
        const cashData = cash.data as { withdrawals?: WithdrawalView[]; role?: string; error?: string } | null;
        const cashPastData = cashPast.data as { withdrawals?: WithdrawalView[]; error?: string } | null;
        if (!pending.res.ok || !past.res.ok || !cash.res.ok || !cashPast.res.ok) {
          setError(pendingData?.error ?? pastData?.error ?? cashData?.error ?? cashPastData?.error ?? "No se pudieron cargar los movimientos.");
          return;
        }
        setRows(pendingData?.tasks ?? []);
        setHistory(pastData?.tasks ?? []);
        setWithdrawals(cashData?.withdrawals ?? []);
        setWithdrawalHistory(cashPastData?.withdrawals ?? []);
        setCanDeliver(cashData?.role === "banquero");
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
    const task = rows.find((row) => row.id === id);
    setRows((current) => current.filter((row) => row.id !== id));
    if (!task) return;
    const closed: TaskView = { ...task, status: decision, reviewNote: note.trim() };
    setHistory((current) => [closed, ...current.filter((row) => row.id !== id)].sort((a, b) => b.occurrenceDate.localeCompare(a.occurrenceDate)));
  }

  async function deliver(id: string) {
    setError("");
    const res = await fetch(`/api/withdrawals/${id}/complete`, { method: "POST" });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "No se pudo marcar la entrega.");
      return;
    }
    const row = withdrawals.find((item) => item.id === id);
    setWithdrawals((current) => current.filter((item) => item.id !== id));
    if (row) {
      setWithdrawalHistory((current) => [{ ...row, status: "completed", completedAt: new Date().toISOString() }, ...current]);
    }
    setToast("Plata entregada.");
  }

  async function cancelCash(id: string) {
    setError("");
    const res = await fetch(`/api/withdrawals/${id}/cancel`, { method: "POST" });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "No se pudo cancelar el pedido.");
      return;
    }
    const row = withdrawals.find((item) => item.id === id);
    setWithdrawals((current) => current.filter((item) => item.id !== id));
    if (row) {
      setWithdrawalHistory((current) => [{ ...row, status: "cancelled", completedAt: new Date().toISOString() }, ...current]);
    }
    setToast("Pedido cancelado.");
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <header className="flex items-end justify-between gap-3">
          <div>
            <h3 className="font-serif text-2xl">Plata por entregar</h3>
            <p className="text-sm text-muted">Pedidos de retiro que esperan el billete.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${withdrawals.length ? "bg-accent text-white" : "bg-white text-muted"}`}>
            {loaded ? withdrawals.length : "…"}
          </span>
        </header>
        {withdrawals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white/70 px-5 py-8 text-center">
            <p className="font-serif text-2xl">{loaded ? "Nada por entregar" : "Cargando…"}</p>
            {loaded ? <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Cuando un niño pida plata, el pedido aparece aquí.</p> : null}
          </div>
        ) : (
          withdrawals.map((row) => (
            <WithdrawalCard
              key={row.id}
              row={row}
              canDeliver={canDeliver}
              onDeliver={deliver}
              onCancel={canDeliver ? cancelCash : undefined}
            />
          ))
        )}
      </section>

      <section className="grid gap-3">
        <header className="flex items-end justify-between gap-3">
          <div>
            <h3 className="font-serif text-2xl">Nuevos a ver</h3>
            <p className="text-sm text-muted">Las que los niños acaban de confirmar.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${rows.length ? "bg-accent text-white" : "bg-white text-muted"}`}>
            {loaded ? rows.length : "…"}
          </span>
        </header>
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white/70 px-5 py-8 text-center">
            <p className="font-serif text-2xl">{loaded ? "Nada nuevo" : "Cargando…"}</p>
            {loaded ? <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Cuando un niño confirme su día, la tarea aparece aquí para que la cierres.</p> : null}
          </div>
        ) : (
          groupByDate(rows, today).map((group) => (
            <div key={group.date} className="grid gap-3">
              <p className="text-sm font-bold text-accent">{group.label.charAt(0).toUpperCase() + group.label.slice(1)}</p>
              {group.tasks.map((task) => (
                <ReviewCard key={task.id} task={task} onReview={review} />
              ))}
            </div>
          ))
        )}
      </section>

      <section className="grid gap-3">
        <header>
          <h3 className="font-serif text-2xl">Historial</h3>
          <p className="text-sm text-muted">Tips cerrados y retiros recientes.</p>
        </header>
        {history.length === 0 && withdrawalHistory.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white/70 px-5 py-6 text-center">
            <p className="font-serif text-xl">{loaded ? "Todavía vacío" : "Cargando…"}</p>
            {loaded ? <p className="mt-1 text-sm text-muted">Cada movimiento que cierres queda en esta lista.</p> : null}
          </div>
        ) : (
          <div className="max-h-[28rem] overflow-auto rounded-2xl border border-line bg-white px-4">
            {withdrawalHistory.length > 0 ? (
              <div className="py-2">
                <p className="pt-2 text-sm font-bold text-muted">Retiros</p>
                <ul>
                  {withdrawalHistory.map((row) => (
                    <WithdrawalHistoryRow key={row.id} row={row} />
                  ))}
                </ul>
              </div>
            ) : null}
            {groupByDate(history, today).map((group) => (
              <div key={group.date} className="py-2">
                <p className="pt-2 text-sm font-bold text-muted">{group.label.charAt(0).toUpperCase() + group.label.slice(1)}</p>
                <ul>
                  {group.tasks.map((task) => (
                    <HistoryRow key={task.id} task={task} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {toast ? (
        <p role="status" className="mihucha-toast fixed top-20 right-6 z-50 max-w-xs rounded-2xl border border-white/15 bg-foreground/60 px-4 py-3 text-sm font-bold text-background shadow-lg backdrop-blur-md">
          {toast}
        </p>
      ) : null}
    </div>
  );
}

function WithdrawalCard({
  row,
  canDeliver,
  onDeliver,
  onCancel,
}: {
  row: WithdrawalView;
  canDeliver: boolean;
  onDeliver: (id: string) => Promise<void>;
  onCancel?: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming || busy) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirming(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming, busy]);

  async function run(action: "deliver" | "cancel") {
    setBusy(true);
    if (action === "deliver") await onDeliver(row.id);
    else if (onCancel) await onCancel(row.id);
    setBusy(false);
    setConfirming(false);
  }

  return (
    <article className="relative overflow-hidden rounded-2xl border border-line bg-white">
      {busy ? <div className="absolute inset-0 z-10 bg-white/55" aria-busy="true" /> : null}
      <div className="border-l-4 border-accent px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-accent">{row.childName}</p>
            <p className="mt-1 font-serif text-2xl leading-tight">Retiro de {WALLET_LABELS[row.walletType]}</p>
            {row.note ? <p className="mt-1 text-sm text-muted">{row.note}</p> : null}
          </div>
          <p className="shrink-0 font-serif text-xl">{pesos(row.amountMinor)}</p>
        </div>
        {canDeliver ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={busy} onClick={() => setConfirming(true)} className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
              Entregar
            </button>
            {onCancel ? (
              <button type="button" disabled={busy} onClick={() => run("cancel")} className="rounded-2xl border border-line px-4 py-3 font-bold text-red-800 disabled:opacity-50">
                Cancelar pedido
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Solo el banquero marca la entrega.</p>
        )}
      </div>
      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-6" role="presentation" onClick={() => { if (!busy) setConfirming(false); }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`entregar-${row.id}`}
            className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id={`entregar-${row.id}`} className="font-serif text-3xl">
                ¿Entregar {pesos(row.amountMinor)}?
              </h2>
              <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="text-sm font-bold text-muted" aria-label="Cerrar">
                ✕
              </button>
            </div>
            <p className="mt-3 text-sm">
              Confirmas que ya le diste el billete a {row.childName}. Se descuenta de {WALLET_LABELS[row.walletType]}.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => run("deliver")} className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
                {busy ? "Entregando…" : "Continuar"}
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="rounded-2xl border border-foreground/20 px-4 py-3 font-bold disabled:opacity-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function WithdrawalHistoryRow({ row }: { row: WithdrawalView }) {
  const chip =
    row.status === "completed"
      ? { label: "Entregado", className: "bg-accent/10 text-accent" }
      : { label: "Cancelado", className: "bg-red-50 text-red-800" };
  return (
    <li className="flex items-start justify-between gap-3 border-b border-line/80 py-3 last:border-0">
      <div className="min-w-0">
        <p className="truncate font-bold">
          {WALLET_LABELS[row.walletType]} · {row.childName}
        </p>
        {row.note ? <p className="mt-1 truncate text-sm text-muted">{row.note}</p> : null}
      </div>
      <div className="shrink-0 text-right">
        <p className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${chip.className}`}>{chip.label}</p>
        <p className="mt-1 text-sm font-bold">{pesos(row.amountMinor)}</p>
      </div>
    </li>
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
    <article className="relative overflow-hidden rounded-2xl border border-line bg-white">
      {busy ? <div className="absolute inset-0 z-10 bg-white/55" aria-busy="true" /> : null}
      <div className="border-l-4 border-accent px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-accent">{task.childName}</p>
            <p className="mt-1 font-serif text-2xl leading-tight">{task.title}</p>
          </div>
          <p className="shrink-0 font-serif text-xl">{pesos(task.amountMinor)}</p>
        </div>
        <label className="mt-4 block text-sm">
          Comentario
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            className="mt-1.5 w-full rounded-2xl border border-line bg-background px-4 py-3"
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
      </div>
    </article>
  );
}

function HistoryRow({ task }: { task: TaskView }) {
  const tone = task.status === "approved" || task.status === "needs_improvement" || task.status === "rejected" ? HISTORY[task.status] : null;
  return (
    <li className="flex items-start justify-between gap-3 border-b border-line/80 py-3 last:border-0">
      <div className="min-w-0">
        <p className="truncate font-bold">{task.title}</p>
        <p className="truncate text-sm text-muted">{task.childName}</p>
        {task.reviewNote ? <p className="mt-1 text-sm">{task.reviewNote}</p> : null}
      </div>
      <div className="shrink-0 text-right">
        {tone ? <p className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${tone.chip}`}>{tone.label}</p> : null}
        <p className="mt-1 text-sm font-bold">{pesos(task.amountMinor)}</p>
      </div>
    </li>
  );
}
