"use client";

import { ArrowDownLeft, ClipboardCheck, History, Wallet } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { FAMILY_SYNC_EVENT } from "@/components/live-sync";
import { dayLabel, santiagoToday } from "@/lib/santiago-date";
import type { TaskView } from "@/lib/tip-cycle";
import type { DepositView, WithdrawalView } from "@/lib/money";
import { UI_TOAST_DURATION_MS } from "@/lib/ui";

type QueueId = "aportes" | "entregar" | "tips" | "historial";

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
  const [deposits, setDeposits] = useState<DepositView[]>([]);
  const [depositHistory, setDepositHistory] = useState<DepositView[]>([]);
  const [canDeliver, setCanDeliver] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [queue, setQueue] = useState<QueueId | null>(null);
  const today = santiagoToday().date;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), UI_TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;

    async function reloadQueues() {
      try {
        const [pending, past, cash, cashPast, aporte, aportePast] = await Promise.all([
          fetch("/api/tip-occurrences?queue=review").then(async (res) => ({ res, data: await res.json().catch(() => null) })),
          fetch("/api/tip-occurrences?queue=history").then(async (res) => ({ res, data: await res.json().catch(() => null) })),
          fetch("/api/withdrawals").then(async (res) => ({ res, data: await res.json().catch(() => null) })),
          fetch("/api/withdrawals?queue=history").then(async (res) => ({ res, data: await res.json().catch(() => null) })),
          fetch("/api/deposits").then(async (res) => ({ res, data: await res.json().catch(() => null) })),
          fetch("/api/deposits?queue=history").then(async (res) => ({ res, data: await res.json().catch(() => null) })),
        ]);
        if (!active) return;
        const pendingData = pending.data as { tasks?: TaskView[]; error?: string } | null;
        const pastData = past.data as { tasks?: TaskView[]; error?: string } | null;
        const cashData = cash.data as { withdrawals?: WithdrawalView[]; role?: string; error?: string } | null;
        const cashPastData = cashPast.data as { withdrawals?: WithdrawalView[]; error?: string } | null;
        const depositData = aporte.data as { deposits?: DepositView[]; role?: string; error?: string } | null;
        const depositPastData = aportePast.data as { deposits?: DepositView[]; error?: string } | null;
        if (!pending.res.ok || !past.res.ok || !cash.res.ok || !cashPast.res.ok || !aporte.res.ok || !aportePast.res.ok) {
          setError(
            pendingData?.error ??
              pastData?.error ??
              cashData?.error ??
              cashPastData?.error ??
              depositData?.error ??
              depositPastData?.error ??
              "No se pudieron cargar los movimientos.",
          );
          return;
        }
        setError("");
        setRows(pendingData?.tasks ?? []);
        setHistory(pastData?.tasks ?? []);
        setWithdrawals(cashData?.withdrawals ?? []);
        setWithdrawalHistory(cashPastData?.withdrawals ?? []);
        const nextDeposits = depositData?.deposits ?? [];
        const nextWithdrawals = cashData?.withdrawals ?? [];
        const nextTips = pendingData?.tasks ?? [];
        setDeposits(nextDeposits);
        setDepositHistory(depositPastData?.deposits ?? []);
        setCanDeliver(cashData?.role === "banquero" || depositData?.role === "banquero");
        setQueue((current) => {
          if (current) return current;
          if (nextTips.length) return "tips";
          if (nextWithdrawals.length) return "entregar";
          if (nextDeposits.length) return "aportes";
          return null;
        });
      } catch {
        /* el próximo sync reintenta */
      } finally {
        if (active) setLoaded(true);
      }
    }

    void reloadQueues();
    window.addEventListener(FAMILY_SYNC_EVENT, reloadQueues);
    return () => {
      active = false;
      window.removeEventListener(FAMILY_SYNC_EVENT, reloadQueues);
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

  async function receiveDeposit(id: string) {
    setError("");
    const res = await fetch(`/api/deposits/${id}/complete`, { method: "POST" });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "No se pudo confirmar el aporte.");
      return;
    }
    const row = deposits.find((item) => item.id === id);
    setDeposits((current) => current.filter((item) => item.id !== id));
    if (row) {
      setDepositHistory((current) => [{ ...row, status: "completed", completedAt: new Date().toISOString() }, ...current]);
    }
    setToast("Aporte recibido y sumado a la Hucha.");
  }

  async function cancelDeposit(id: string) {
    setError("");
    const res = await fetch(`/api/deposits/${id}/cancel`, { method: "POST" });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "No se pudo cancelar el aporte.");
      return;
    }
    const row = deposits.find((item) => item.id === id);
    setDeposits((current) => current.filter((item) => item.id !== id));
    if (row) {
      setDepositHistory((current) => [{ ...row, status: "cancelled", completedAt: new Date().toISOString() }, ...current]);
    }
    setToast("Aporte cancelado.");
  }

  const queues: {
    id: QueueId;
    label: string;
    hint: string;
    count: number;
    tone: string;
    icon: ReactNode;
  }[] = [
    {
      id: "aportes",
      label: "Aportes",
      hint: "Plata externa que el niño quiere sumar a una Hucha.",
      count: deposits.length,
      tone: "bg-[#12a35a] text-white",
      icon: <ArrowDownLeft className="size-5" aria-hidden />,
    },
    {
      id: "entregar",
      label: "Entregar",
      hint: "Pedidos de retiro que esperan el billete.",
      count: withdrawals.length,
      tone: "bg-accent text-white",
      icon: <Wallet className="size-5" aria-hidden />,
    },
    {
      id: "tips",
      label: "Tips",
      hint: "Las que los niños acaban de confirmar.",
      count: rows.length,
      tone: "bg-accent text-white",
      icon: <ClipboardCheck className="size-5" aria-hidden />,
    },
    {
      id: "historial",
      label: "Historial",
      hint: "Tips cerrados, aportes y retiros recientes.",
      count: 0,
      tone: "bg-white text-muted",
      icon: <History className="size-5" aria-hidden />,
    },
  ];

  const active = queues.find((item) => item.id === queue) ?? null;

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {queues.map((item) => {
          const on = queue === item.id;
          const hasNews = item.id !== "historial" && item.count > 0;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={on}
              onClick={() => setQueue(item.id)}
              className={`relative flex min-w-0 flex-col items-start gap-2 rounded-2xl border px-3 py-3 text-left transition ${
                on ? "border-accent bg-accent/10" : "border-line bg-white hover:border-accent/40"
              }`}
            >
              <span className={`grid size-9 place-items-center rounded-xl ${on ? "bg-accent text-white" : "bg-[#f3f0ea] text-foreground/70"}`}>
                {item.icon}
              </span>
              <span className="font-serif text-lg leading-tight">{item.label}</span>
              {hasNews ? (
                <span className={`absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-xs font-bold ${item.tone}`}>
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {active ? (
        <section className="grid gap-3">
          <header>
            <h3 className="font-serif text-2xl">{active.label}</h3>
            <p className="text-sm text-muted">{active.hint}</p>
          </header>

          {queue === "aportes" ? (
            deposits.length === 0 ? (
              <EmptyQueue loaded={loaded} title="Nada por recibir" hint="Cuando un niño aporte plata, el aviso aparece aquí." />
            ) : (
              deposits.map((row) => (
                <DepositCard
                  key={row.id}
                  row={row}
                  canReceive={canDeliver}
                  onReceive={receiveDeposit}
                  onCancel={canDeliver ? cancelDeposit : undefined}
                />
              ))
            )
          ) : null}

          {queue === "entregar" ? (
            withdrawals.length === 0 ? (
              <EmptyQueue loaded={loaded} title="Nada por entregar" hint="Cuando un niño pida plata, el pedido aparece aquí." />
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
            )
          ) : null}

          {queue === "tips" ? (
            rows.length === 0 ? (
              <EmptyQueue loaded={loaded} title="Nada nuevo" hint="Cuando un niño confirme su día, la tarea aparece aquí para que la cierres." />
            ) : (
              groupByDate(rows, today).map((group) => (
                <div key={group.date} className="grid gap-3">
                  <p className="text-sm font-bold text-accent">{group.label.charAt(0).toUpperCase() + group.label.slice(1)}</p>
                  {group.tasks.map((task) => (
                    <ReviewCard key={task.id} task={task} onReview={review} />
                  ))}
                </div>
              ))
            )
          ) : null}

          {queue === "historial" ? (
            history.length === 0 && withdrawalHistory.length === 0 && depositHistory.length === 0 ? (
              <EmptyQueue loaded={loaded} title="Todavía vacío" hint="Cada movimiento que cierres queda en esta lista." dashed={false} />
            ) : (
              <div className="max-h-[28rem] overflow-auto rounded-2xl border border-line bg-white px-4">
                {depositHistory.length > 0 ? (
                  <div className="py-2">
                    <p className="pt-2 text-sm font-bold text-muted">Aportes</p>
                    <ul>
                      {depositHistory.map((row) => (
                        <DepositHistoryRow key={row.id} row={row} />
                      ))}
                    </ul>
                  </div>
                ) : null}
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
            )
          ) : null}
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-white/70 px-5 py-8 text-center">
          <p className="font-serif text-2xl">{loaded ? "Elige una cola" : "Cargando…"}</p>
          {loaded ? <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Abre Aportes, Entregar o Tips para ver el detalle. El punto avisa si hay novedades.</p> : null}
        </div>
      )}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {toast ? (
        <p role="status" className="mihucha-toast fixed top-20 right-6 z-50 max-w-xs rounded-2xl border border-white/15 bg-foreground/60 px-4 py-3 text-sm font-bold text-background shadow-lg backdrop-blur-md">
          {toast}
        </p>
      ) : null}
    </div>
  );
}

function EmptyQueue({
  loaded,
  title,
  hint,
  dashed = true,
}: {
  loaded: boolean;
  title: string;
  hint: string;
  dashed?: boolean;
}) {
  return (
    <div className={`rounded-2xl border bg-white/70 px-5 py-8 text-center ${dashed ? "border-dashed border-line" : "border-line"}`}>
      <p className="font-serif text-2xl">{loaded ? title : "Cargando…"}</p>
      {loaded ? <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

function DepositCard({
  row,
  canReceive,
  onReceive,
  onCancel,
}: {
  row: DepositView;
  canReceive: boolean;
  onReceive: (id: string) => Promise<void>;
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

  async function run(action: "receive" | "cancel") {
    setBusy(true);
    if (action === "receive") await onReceive(row.id);
    else if (onCancel) await onCancel(row.id);
    setBusy(false);
    setConfirming(false);
  }

  return (
    <article className="relative overflow-hidden rounded-2xl border border-line bg-white">
      {busy ? <div className="absolute inset-0 z-10 bg-white/55" aria-busy="true" /> : null}
      <div className="border-l-4 border-[#12a35a] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-[#12a35a]">{row.childName}</p>
            <p className="mt-1 font-serif text-2xl leading-tight">Aporte a {WALLET_LABELS[row.walletType]}</p>
            {row.note ? <p className="mt-1 text-sm text-muted">{row.note}</p> : null}
          </div>
          <p className="shrink-0 font-serif text-xl">{pesos(row.amountMinor)}</p>
        </div>
        {canReceive ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={busy} onClick={() => setConfirming(true)} className="rounded-2xl bg-[#12a35a] px-4 py-3 font-bold text-white disabled:opacity-50">
              Recibí el dinero
            </button>
            {onCancel ? (
              <button type="button" disabled={busy} onClick={() => run("cancel")} className="rounded-2xl border border-line px-4 py-3 font-bold text-red-800 disabled:opacity-50">
                Cancelar aporte
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Solo el banquero confirma que recibió el dinero.</p>
        )}
      </div>
      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-6" role="presentation" onClick={() => { if (!busy) setConfirming(false); }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`aporte-${row.id}`}
            className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id={`aporte-${row.id}`} className="font-serif text-3xl">
                ¿Recibiste {pesos(row.amountMinor)}?
              </h2>
              <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="text-sm font-bold text-muted" aria-label="Cerrar">
                ✕
              </button>
            </div>
            <p className="mt-3 text-sm">
              Confirmas que ya tienes el billete de {row.childName}. Se suma a {WALLET_LABELS[row.walletType]}.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => run("receive")} className="rounded-2xl bg-[#12a35a] px-4 py-3 font-bold text-white disabled:opacity-50">
                {busy ? "Confirmando…" : "Continuar"}
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

function DepositHistoryRow({ row }: { row: DepositView }) {
  const chip =
    row.status === "completed"
      ? { label: "Recibido", className: "bg-[#e5f8ec] text-[#0d7a45]" }
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

  const retry = Boolean(task.isRetry);

  return (
    <article className={`relative overflow-hidden rounded-2xl border bg-white ${retry ? "border-amber-300" : "border-line"}`}>
      {busy ? <div className="absolute inset-0 z-10 bg-white/55" aria-busy="true" /> : null}
      <div className={`border-l-4 px-4 py-4 ${retry ? "border-amber-500" : "border-accent"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`text-xs font-bold uppercase tracking-wide ${retry ? "text-amber-800" : "text-accent"}`}>{task.childName}</p>
              {retry ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-950">
                  Reintento
                </span>
              ) : null}
            </div>
            <p className="mt-1 font-serif text-2xl leading-tight">{task.title}</p>
          </div>
          <p className="shrink-0 font-serif text-xl">{pesos(task.amountMinor)}</p>
        </div>
        {retry ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-extrabold uppercase tracking-wide text-amber-900">Ya lo había pedido mejorar</p>
            {task.previousReviewNote ? (
              <p className="mt-1 text-sm text-amber-950">“{task.previousReviewNote}”</p>
            ) : (
              <p className="mt-1 text-sm text-amber-950">El niño dice que lo arregló y lo vuelve a mandar.</p>
            )}
          </div>
        ) : null}
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
        <p className="mt-2 text-xs text-muted">Hecha paga. Mejorable no paga y el niño reintenta. No hecha no paga y se cierra.</p>
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
