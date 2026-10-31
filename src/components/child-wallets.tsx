"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import type { WalletType, WalletView, WithdrawalView } from "@/lib/money";

function pesos(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`;
}

const ORDER: WalletType[] = ["gasto", "donaciones", "inversion"];

const WALLET_LABELS: Record<WalletType, string> = {
  inversion: "Inversión",
  gasto: "Gasto",
  donaciones: "Donaciones",
};

export function ChildWallets({ initial }: { initial: WalletView[] }) {
  const [wallets, setWallets] = useState(initial);
  const [pending, setPending] = useState<WithdrawalView[]>([]);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [action, setAction] = useState<"retirar" | "transferir" | null>(null);
  const [focus, setFocus] = useState<WalletType | null>(null);
  const [busyLock, setBusyLock] = useState(false);

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
    const timer = window.setTimeout(() => setToast(""), 2000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function openRetirar(type: WalletType) {
    setError("");
    setFocus(type);
    setAction("retirar");
  }

  function openTransferir() {
    setError("");
    setFocus("gasto");
    setAction("transferir");
  }

  function close() {
    if (busyLock) return;
    setAction(null);
    setFocus(null);
    setError("");
  }

  async function refreshWallets(next?: WalletView[]) {
    if (next) {
      setWallets(next);
      return;
    }
    const res = await fetch("/api/wallets");
    const data = (await res.json().catch(() => null)) as { wallets?: WalletView[] } | null;
    if (res.ok && data?.wallets) setWallets(data.wallets);
  }

  async function onRetirar(amountMinor: number, note: string) {
    if (!focus) return;
    setBusyLock(true);
    setError("");
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletType: focus, amountMinor, note }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; withdrawal?: WithdrawalView } | null;
      if (!res.ok || !data?.withdrawal) {
        setError(data?.error ?? "No se pudo pedir la plata.");
        return;
      }
      setPending((current) => [data.withdrawal!, ...current]);
      await refreshWallets();
      setAction(null);
      setFocus(null);
      setToast(`Pedido de ${pesos(amountMinor)} enviado.`);
    } finally {
      setBusyLock(false);
    }
  }

  async function onTransferir(amountMinor: number) {
    setBusyLock(true);
    setError("");
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMinor }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; wallets?: WalletView[] } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo transferir.");
        return;
      }
      await refreshWallets(data?.wallets);
      setAction(null);
      setFocus(null);
      setToast(`${pesos(amountMinor)} pasó a Inversión.`);
    } finally {
      setBusyLock(false);
    }
  }

  async function cancelPedido(id: string) {
    setBusyLock(true);
    setError("");
    try {
      const res = await fetch(`/api/withdrawals/${id}/cancel`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo cancelar.");
        return;
      }
      setPending((current) => current.filter((row) => row.id !== id));
      await refreshWallets();
      setToast("Pedido cancelado.");
    } finally {
      setBusyLock(false);
    }
  }

  const byType = new Map(wallets.map((wallet) => [wallet.type, wallet]));
  const gasto = byType.get("gasto");

  return (
    <section className="mt-8 grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {ORDER.map((type) => {
          const wallet = byType.get(type) ?? { type, balanceMinor: 0, reservedMinor: 0, availableMinor: 0 };
          return (
            <article key={type} className="relative rounded-3xl border border-line bg-card p-5">
              {busyLock ? <div className="absolute inset-0 z-10 rounded-3xl bg-white/50" aria-hidden /> : null}
              <p className="text-sm text-muted">{WALLET_LABELS[type]}</p>
              <p className="mt-1 text-[11px] text-muted">Disponible</p>
              <p className="mt-1 font-serif text-4xl leading-none">{pesos(wallet.availableMinor)}</p>
              {wallet.reservedMinor > 0 ? (
                <p className="mt-2 text-sm font-bold text-accent">Pediste {pesos(wallet.reservedMinor)}</p>
              ) : null}
              <div className={`mt-4 grid gap-2 ${type === "gasto" ? "grid-cols-2" : "grid-cols-1"}`}>
                <button
                  type="button"
                  disabled={busyLock || wallet.availableMinor <= 0}
                  onClick={() => openRetirar(type)}
                  className="rounded-2xl border border-foreground/15 px-3 py-2.5 text-sm font-bold disabled:opacity-40"
                >
                  Retirar
                </button>
                {type === "gasto" ? (
                  <button
                    type="button"
                    disabled={busyLock || (gasto?.availableMinor ?? 0) <= 0}
                    onClick={openTransferir}
                    className="rounded-2xl bg-accent px-3 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                  >
                    A inversión
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {pending.length > 0 ? (
        <div className="rounded-3xl border border-line bg-card p-5">
          <h2 className="font-serif text-2xl">Pedidos abiertos</h2>
          <ul className="mt-3 grid gap-2">
            {pending.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3">
                <div className="min-w-0">
                  <p className="font-bold">
                    {pesos(row.amountMinor)} · {WALLET_LABELS[row.walletType]}
                  </p>
                  {row.note ? <p className="truncate text-sm text-muted">{row.note}</p> : <p className="text-sm text-muted">Esperando entrega</p>}
                </div>
                <button type="button" disabled={busyLock} onClick={() => cancelPedido(row.id)} className="shrink-0 text-sm font-bold text-red-800 disabled:opacity-50">
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error && !action ? <p className="text-sm text-red-700">{error}</p> : null}
      {toast ? (
        <p role="status" className="miucha-toast fixed top-20 right-6 z-50 max-w-xs rounded-2xl border border-white/15 bg-foreground/60 px-4 py-3 text-sm font-bold text-background shadow-lg backdrop-blur-md">
          {toast}
        </p>
      ) : null}

      {action === "retirar" && focus ? (
        <MoneyModal
          title={`Retirar de ${WALLET_LABELS[focus]}`}
          hint="El banquero te entrega el billete. Mientras tanto, ese monto queda reservado."
          max={byType.get(focus)?.availableMinor ?? 0}
          noteField={focus === "donaciones" ? "¿A quién ayuda?" : "¿Para qué? (opcional)"}
          noteRequired={false}
          busy={busyLock}
          error={error}
          onClearError={() => setError("")}
          onClose={close}
          onSubmit={onRetirar}
          confirmLabel="Pedir plata"
        />
      ) : null}

      {action === "transferir" ? (
        <MoneyModal
          title="Pasar a Inversión"
          hint="Solo desde Gasto hacia Inversión."
          max={gasto?.availableMinor ?? 0}
          busy={busyLock}
          error={error}
          onClearError={() => setError("")}
          onClose={close}
          onSubmit={(amount) => onTransferir(amount)}
          confirmLabel="Transferir"
        />
      ) : null}
    </section>
  );
}

function MoneyModal({
  title,
  hint,
  max,
  noteField,
  noteRequired,
  busy,
  error,
  onClearError,
  onClose,
  onSubmit,
  confirmLabel,
}: {
  title: string;
  hint: string;
  max: number;
  noteField?: string;
  noteRequired?: boolean;
  busy: boolean;
  error: string;
  onClearError: () => void;
  onClose: () => void;
  onSubmit: (amount: number, note: string) => Promise<void>;
  confirmLabel: string;
}) {
  const titleId = useId();
  const [amount, setAmount] = useState(max > 0 ? String(max) : "");
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState("");
  const shownError = localError || error;

  function clearErrors() {
    setLocalError("");
    onClearError();
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    clearErrors();
    const raw = amount.trim();
    if (!raw) {
      setLocalError("Escribe cuánto quieres mover.");
      return;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
      setLocalError("El monto tiene que ser un número entero mayor que cero.");
      return;
    }
    if (value > max) {
      setLocalError(`Solo puedes usar hasta ${pesos(max)}.`);
      return;
    }
    if (noteRequired && !note.trim()) {
      setLocalError("Cuéntanos para qué es.");
      return;
    }
    await onSubmit(value, note.trim());
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-6" role="presentation" onClick={() => { if (!busy) onClose(); }}>
      <form
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm rounded-3xl bg-card p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        {busy ? <div className="absolute inset-0 z-10 grid place-items-center rounded-3xl bg-white/55" aria-busy="true"><Spinner /></div> : null}
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-serif text-3xl">
            {title}
          </h2>
          <button type="button" disabled={busy} onClick={onClose} className="text-sm font-bold text-muted disabled:opacity-50" aria-label="Cerrar">
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">{hint}</p>
        <p className="mt-1 text-sm font-bold">Disponible: {pesos(max)}</p>
        <label className="mt-5 block text-sm">
          Monto
          <input
            inputMode="numeric"
            autoComplete="off"
            value={amount}
            onChange={(event) => {
              const next = event.target.value.replace(/\D/g, "");
              clearErrors();
              setAmount(next);
            }}
            aria-invalid={Boolean(shownError)}
            className={`mt-1.5 w-full rounded-2xl border bg-white px-4 py-3 ${shownError ? "border-red-700" : "border-line"}`}
          />
        </label>
        {noteField ? (
          <label className="mt-3 block text-sm">
            {noteField}
            <input
              value={note}
              onChange={(event) => {
                clearErrors();
                setNote(event.target.value);
              }}
              className="mt-1.5 w-full rounded-2xl border border-line bg-white px-4 py-3"
            />
          </label>
        ) : null}
        {shownError ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {shownError}
          </p>
        ) : null}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="submit" disabled={busy} className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
            {confirmLabel}
          </button>
          <button type="button" disabled={busy} onClick={onClose} className="rounded-2xl border border-foreground/20 px-4 py-3 font-bold disabled:opacity-50">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function Spinner() {
  return <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />;
}
