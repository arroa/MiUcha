"use client";

import { PartyPopper } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";

import { tipIconFor } from "@/lib/tip-icons";
import type { TaskView, TipWhen } from "@/lib/tip-cycle";

function pesos(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`;
}

export function TaskCart({
  tasks,
  reviewerNames,
}: {
  tasks: TaskView[];
  reviewerNames: string[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(tasks);
  const [active, setActive] = useState<TaskView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [celebratingId, setCelebratingId] = useState("");

  useEffect(() => {
    setRows(tasks);
  }, [tasks]);

  const openTasks = useMemo(
    () => rows.filter((task) => task.status === "available" || task.status === "needs_improvement"),
    [rows],
  );
  const doneTasks = useMemo(
    () => rows.filter((task) => task.status !== "available" && task.status !== "needs_improvement"),
    [rows],
  );

  async function submit(when: TipWhen) {
    if (!active) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/tip-occurrences/done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: active.id, when }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo enviar el Tip.");
        return;
      }
      const tipId = active.id;
      setActive(null);
      setCelebratingId(tipId);
      setRows((current) =>
        current.map((task) =>
          task.id === tipId ? { ...task, status: "submitted", reviewNote: when === "ayer" ? "Enviado · ayer" : "Enviado · hoy" } : task,
        ),
      );
      window.setTimeout(() => {
        setCelebratingId("");
        router.refresh();
      }, 900);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="yo-rise-2 relative">
      <h3 className="text-2xl font-extrabold leading-tight">Mis Tips de hoy</h3>
      <p className="mt-0.5 text-sm text-muted">Cuando termines uno, toca Lo hice.</p>

      {rows.length === 0 ? <p className="mt-4 text-muted">Hoy no tienes Tips.</p> : null}

      <ul className="mt-4 grid gap-2.5">
        {openTasks.map((task) => (
          <TipRow
            key={task.id}
            task={task}
            open
            celebrating={celebratingId === task.id}
            busy={busy}
            onLoHice={() => {
              setError("");
              setActive(task);
            }}
          />
        ))}
        {doneTasks.map((task) => (
          <TipRow key={task.id} task={task} open={false} celebrating={celebratingId === task.id} busy={busy} />
        ))}
      </ul>

      {active ? (
        <LoHiceModal
          task={active}
          reviewerNames={reviewerNames}
          busy={busy}
          error={error}
          onClose={() => {
            if (!busy) {
              setActive(null);
              setError("");
            }
          }}
          onConfirm={submit}
        />
      ) : null}
    </section>
  );
}

function TipRow({
  task,
  open,
  celebrating,
  busy,
  onLoHice,
}: {
  task: TaskView;
  open: boolean;
  celebrating: boolean;
  busy: boolean;
  onLoHice?: () => void;
}) {
  const Icon = tipIconFor({ title: task.title });
  const note = task.status === "needs_improvement" ? task.reviewNote : "";

  return (
    <li className={celebrating ? "tip-celebrate" : undefined}>
      {open ? (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-card px-3 py-3 shadow-sm">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#efe9ff] text-accent">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{task.title}</p>
            {note ? <p className="mt-1 text-sm text-red-700">{note}</p> : null}
            <p className="mt-0.5 text-sm font-extrabold text-[#12a35a]">+{pesos(task.amountMinor)}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onLoHice}
            className="shrink-0 rounded-xl bg-accent px-3 py-2 text-sm font-extrabold text-white disabled:opacity-50"
          >
            Lo hice
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-[#f8f5ff] px-3 py-3 shadow-sm">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-muted">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{task.title}</p>
            <p className="mt-1 text-sm text-muted">{statusLabel(task)}</p>
          </div>
          <span className="text-sm font-extrabold text-muted">{pesos(task.amountMinor)}</span>
        </div>
      )}
    </li>
  );
}

function LoHiceModal({
  task,
  reviewerNames,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  task: TaskView;
  reviewerNames: string[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (when: TipWhen) => Promise<void>;
}) {
  const titleId = useId();
  const [when, setWhen] = useState<TipWhen | null>(null);
  const who = formatNames(reviewerNames);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-6" role="presentation" onClick={() => { if (!busy) onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        {busy ? <div className="absolute inset-0 z-10 rounded-3xl bg-white/55" aria-busy="true" /> : null}
        <button type="button" disabled={busy} onClick={onClose} className="absolute right-4 top-4 text-sm font-bold text-muted disabled:opacity-50" aria-label="Cerrar">
          ✕
        </button>

        <div className="flex items-center gap-2 text-accent">
          <PartyPopper className="size-6" aria-hidden />
          <p className="text-sm font-bold">¡Qué orgullo!</p>
        </div>
        <h2 id={titleId} className="mt-2 text-2xl font-extrabold leading-tight">
          ¿Lo hiciste hoy o ayer?
        </h2>
        <p className="mt-2 text-sm text-muted">
          Completaste <span className="font-bold text-foreground">{task.title}</span> (+{pesos(task.amountMinor)}).
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setWhen("hoy")}
            className={`rounded-2xl border-2 px-3 py-3 font-extrabold ${when === "hoy" ? "border-accent bg-[#efe9ff] text-accent" : "border-line bg-white"}`}
          >
            Hoy
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setWhen("ayer")}
            className={`rounded-2xl border-2 px-3 py-3 font-extrabold ${when === "ayer" ? "border-accent bg-[#efe9ff] text-accent" : "border-line bg-white"}`}
          >
            Ayer
          </button>
        </div>

        <p className="mt-4 rounded-2xl bg-[#efe9ff] px-4 py-3 text-sm font-bold text-[#5b45c4]">
          ¡Genial! {who} lo va a revisar y pronto te llegan noticias.
        </p>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy || !when}
            onClick={() => when && onConfirm(when)}
            className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            Continuar
          </button>
          <button type="button" disabled={busy} onClick={onClose} className="rounded-2xl border border-foreground/20 px-4 py-3 font-bold disabled:opacity-50">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function formatNames(names: string[]) {
  if (names.length === 0) return "Un adulto de tu familia";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} o ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} o ${names[names.length - 1]}`;
}

function statusLabel(task: TaskView) {
  if (task.reviewNote.startsWith("Enviado")) return task.reviewNote;
  if (task.status === "submitted") return "En revisión";
  if (task.status === "approved") return "Tip recibido";
  if (task.status === "rejected") return task.reviewNote || "No quedó hecha";
  return task.reviewNote || "Puede mejorar";
}
