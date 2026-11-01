"use client";

import { Banknote } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";

import type { GoalView } from "@/lib/goals";
import type { WalletType, WalletView, WithdrawalView } from "@/lib/money";
import { parsePesosInput } from "@/lib/pesos-input";
import { UI_TOAST_DURATION_MS } from "@/lib/ui";
import { WALLET_LABELS } from "@/lib/wallet-labels";

function pesos(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`;
}

const ASK_WALLETS: WalletType[] = ["gasto", "inversion"];

export function GoalBanqueroAsk({
  goal,
  initialWallets,
}: {
  goal: GoalView;
  initialWallets: WalletView[];
}) {
  const [open, setOpen] = useState(false);
  const [wallets, setWallets] = useState(initialWallets);
  const [pending, setPending] = useState<WithdrawalView[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    setWallets(initialWallets);
  }, [initialWallets]);

  useEffect(() => {
    let active = true;
    fetch("/api/withdrawals")
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { withdrawals?: WithdrawalView[] } | null;
        if (!active || !res.ok) return;
        setPending((data?.withdrawals ?? []).filter((row) => row.status === "pending"));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), UI_TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const byType = new Map(wallets.map((w) => [w.type, w]));
  const gastoAvail = byType.get("gasto")?.availableMinor ?? 0;
  const inversionAvail = byType.get("inversion")?.availableMinor ?? 0;
  const canAsk = gastoAvail + inversionAvail > 0;
  const relatedPending = pending.filter((row) =>
    ASK_WALLETS.includes(row.walletType) &&
    (row.note.toLocaleLowerCase("es").includes(goal.name.toLocaleLowerCase("es")) || row.note.toLocaleLowerCase("es").includes("comprar")),
  );

  async function refreshWallets() {
    const res = await fetch("/api/wallets");
    const data = (await res.json().catch(() => null)) as { wallets?: WalletView[] } | null;
    if (res.ok && data?.wallets) setWallets(data.wallets);
  }

  async function submit(walletType: WalletType, amountMinor: number, note: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletType, amountMinor, note }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; withdrawal?: WithdrawalView } | null;
      if (!res.ok || !data?.withdrawal) {
        setError(data?.error ?? "No se pudo pedir la plata.");
        return;
      }
      setPending((current) => [data.withdrawal!, ...current]);
      await refreshWallets();
      setOpen(false);
      setToast("¡Tu Banquero recibió tu solicitud!");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {relatedPending.length > 0 ? (
        <div className="rounded-2xl border border-accent/25 bg-[#efe9ff] px-4 py-3 text-sm">
          <p className="font-bold text-accent">Tu Banquero recibió tu solicitud</p>
          <ul className="mt-1 space-y-1 text-muted">
            {relatedPending.map((row) => (
              <li key={row.id}>
                {pesos(row.amountMinor)} desde {WALLET_LABELS[row.walletType]}
                {row.note ? ` · ${row.note}` : ""}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs">Esa plata ya no cuenta como disponible hasta que te la entreguen o canceles el pedido.</p>
        </div>
      ) : null}

      <button
        type="button"
        disabled={!canAsk || busy}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-accent bg-white py-3.5 font-extrabold text-accent disabled:opacity-40"
      >
        <Banknote className="size-5" aria-hidden />
        Pedir dinero a mi Banquero
      </button>

      {!canAsk ? (
        <p className="text-center text-xs text-muted">No tienes plata disponible en Gasto ni Inversión para pedir.</p>
      ) : (
        <p className="text-center text-xs text-muted">
          ¡Hora de hablar con tu Banquero! Puedes pedir desde Gasto o Inversión. Generosidad es solo para ayudar.
        </p>
      )}

      {open ? (
        <AskModal
          goal={goal}
          gastoAvail={gastoAvail}
          inversionAvail={inversionAvail}
          busy={busy}
          error={error}
          onClearError={() => setError("")}
          onClose={() => {
            if (!busy) setOpen(false);
          }}
          onSubmit={submit}
        />
      ) : null}

      {toast ? (
        <p role="status" className="mihucha-toast fixed top-20 right-6 z-50 max-w-xs rounded-2xl border border-white/15 bg-foreground/60 px-4 py-3 text-sm font-bold text-background shadow-lg backdrop-blur-md">
          {toast}
        </p>
      ) : null}
    </div>
  );
}

function AskModal({
  goal,
  gastoAvail,
  inversionAvail,
  busy,
  error,
  onClearError,
  onClose,
  onSubmit,
}: {
  goal: GoalView;
  gastoAvail: number;
  inversionAvail: number;
  busy: boolean;
  error: string;
  onClearError: () => void;
  onClose: () => void;
  onSubmit: (walletType: WalletType, amount: number, note: string) => Promise<void>;
}) {
  const titleId = useId();
  const defaultWallet: WalletType = gastoAvail > 0 ? "gasto" : "inversion";
  const [walletType, setWalletType] = useState<WalletType>(defaultWallet);
  const max = walletType === "gasto" ? gastoAvail : inversionAvail;
  const suggested = Math.min(goal.targetAmountMinor, max);
  const [amount, setAmount] = useState(suggested > 0 ? String(suggested) : "");
  const [note, setNote] = useState(`Comprar mi ${goal.name}`);
  const [localError, setLocalError] = useState("");
  const shownError = localError || error;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  function pickWallet(next: WalletType) {
    setWalletType(next);
    const nextMax = next === "gasto" ? gastoAvail : inversionAvail;
    const nextSuggested = Math.min(goal.targetAmountMinor, nextMax);
    setAmount(nextSuggested > 0 ? String(nextSuggested) : "");
    setLocalError("");
    onClearError();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLocalError("");
    onClearError();
    const parsed = parsePesosInput(amount);
    if (!parsed.ok) {
      setLocalError(parsed.error === "Escribe un monto." ? "Escribe cuánto quieres pedir." : parsed.error);
      return;
    }
    if (parsed.value > max) {
      setLocalError(`Solo puedes pedir hasta ${pesos(max)} desde ${WALLET_LABELS[walletType]}.`);
      return;
    }
    await onSubmit(walletType, parsed.value, note.trim());
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-6" role="presentation" onClick={() => { if (!busy) onClose(); }}>
      <form
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        {busy ? <div className="absolute inset-0 z-10 rounded-3xl bg-white/55" aria-busy="true" /> : null}
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-2xl font-extrabold leading-tight">
            Pedir a mi Banquero
          </h2>
          <button type="button" disabled={busy} onClick={onClose} className="text-sm font-bold text-muted disabled:opacity-50" aria-label="Cerrar">
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">
          Para conseguir tu {goal.name}. El Banquero te entrega el billete; mientras tanto el monto queda reservado.
        </p>

        <p className="mt-4 text-sm font-bold">¿Desde qué Hucha?</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {ASK_WALLETS.map((type) => {
            const avail = type === "gasto" ? gastoAvail : inversionAvail;
            const on = walletType === type;
            return (
              <button
                key={type}
                type="button"
                disabled={busy || avail <= 0}
                onClick={() => pickWallet(type)}
                className={`rounded-2xl border-2 px-3 py-3 text-left disabled:opacity-40 ${
                  on ? "border-accent bg-[#efe9ff]" : "border-line bg-white"
                }`}
              >
                <span className="block text-sm font-extrabold">{WALLET_LABELS[type]}</span>
                <span className="block text-xs text-muted">{pesos(avail)}</span>
              </button>
            );
          })}
        </div>

        {gastoAvail <= 0 && inversionAvail > 0 ? (
          <p className="mt-2 text-xs text-muted">No tienes plata en Gasto; puedes pedir desde Inversión.</p>
        ) : null}

        <label className="mt-4 block text-sm font-bold">
          Monto
          <input
            inputMode="numeric"
            value={amount}
            disabled={busy}
            onChange={(event) => {
              setLocalError("");
              onClearError();
              setAmount(event.target.value);
            }}
            className={`mt-1.5 w-full rounded-2xl border bg-white px-4 py-3 font-normal ${shownError ? "border-red-700" : "border-line"}`}
          />
        </label>

        <label className="mt-3 block text-sm font-bold">
          ¿Para qué?
          <input
            value={note}
            disabled={busy}
            onChange={(event) => {
              setLocalError("");
              onClearError();
              setNote(event.target.value);
            }}
            className="mt-1.5 w-full rounded-2xl border border-line bg-white px-4 py-3 font-normal"
          />
        </label>

        {shownError ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {shownError}
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="submit" disabled={busy || max <= 0} className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
            Continuar
          </button>
          <button type="button" disabled={busy} onClick={onClose} className="rounded-2xl border border-foreground/20 px-4 py-3 font-bold disabled:opacity-50">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
