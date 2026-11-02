"use client";

import { ArrowDownLeft, ArrowUpRight, Heart, ShoppingCart, TrendingUp } from "lucide-react";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { FAMILY_SYNC_EVENT } from "@/components/live-sync";
import type { DepositView, WalletView, WithdrawalView } from "@/lib/money";
import { formatPesosGrouped, parsePesosInput } from "@/lib/pesos-input";
import { UI_TOAST_DURATION_MS } from "@/lib/ui";
import { WALLET_LABELS, type WalletType } from "@/lib/wallet-labels";

function pesos(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`;
}

/** Orden Soft Quest: Gasto · Inversión · Generosidad */
const ORDER: WalletType[] = ["gasto", "inversion", "donaciones"];

/** Aportes externos solo a Gasto o Inversión (Generosidad es para dar, no para meter plata). */
const APORTAR_WALLETS: WalletType[] = ["gasto", "inversion"];

const WALLET_META: Record<WalletType, { tone: string; icon: ReactNode }> = {
  gasto: {
    tone: "bg-[#ffe8ee] text-[#c2345a]",
    icon: <ShoppingCart className="size-5" aria-hidden />,
  },
  inversion: {
    tone: "bg-[#e5f8ec] text-[#0d7a45]",
    icon: <TrendingUp className="size-5" aria-hidden />,
  },
  donaciones: {
    tone: "bg-[#fff4d6] text-[#a66b00]",
    icon: <Heart className="size-5" aria-hidden />,
  },
};

export function ChildWallets({ initial }: { initial: WalletView[] }) {
  const [wallets, setWallets] = useState(initial);
  const [pending, setPending] = useState<WithdrawalView[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<DepositView[]>([]);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [action, setAction] = useState<"retirar" | "transferir" | "aportar" | null>(null);
  const [focus, setFocus] = useState<WalletType | null>(null);
  const [busyLock, setBusyLock] = useState(false);

  useEffect(() => {
    setWallets(initial);
  }, [initial]);

  useEffect(() => {
    let active = true;

    async function reloadPending() {
      try {
        const [cashRes, depositRes] = await Promise.all([fetch("/api/withdrawals"), fetch("/api/deposits")]);
        const cashData = (await cashRes.json().catch(() => null)) as { withdrawals?: WithdrawalView[] } | null;
        const depositData = (await depositRes.json().catch(() => null)) as { deposits?: DepositView[] } | null;
        if (!active) return;
        if (cashRes.ok) setPending((cashData?.withdrawals ?? []).filter((row) => row.status === "pending"));
        if (depositRes.ok) setPendingDeposits((depositData?.deposits ?? []).filter((row) => row.status === "pending"));
      } catch {
        /* el próximo sync reintenta */
      }
    }

    void reloadPending();
    window.addEventListener(FAMILY_SYNC_EVENT, reloadPending);
    return () => {
      active = false;
      window.removeEventListener(FAMILY_SYNC_EVENT, reloadPending);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), UI_TOAST_DURATION_MS);
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

  function openAportar() {
    setError("");
    setFocus("gasto");
    setAction("aportar");
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
      setToast(`Pedido de ${pesos(amountMinor)} enviado a tu Banquero.`);
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

  async function onAportar(walletType: WalletType, amountMinor: number, note: string) {
    setBusyLock(true);
    setError("");
    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletType, amountMinor, note }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; deposit?: DepositView } | null;
      if (!res.ok || !data?.deposit) {
        setError(data?.error ?? "No se pudo avisar el aporte.");
        return;
      }
      setPendingDeposits((current) => [data.deposit!, ...current]);
      setAction(null);
      setFocus(null);
      setToast(`Aporte de ${pesos(amountMinor)} avisado a tu Banquero.`);
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

  async function cancelAporte(id: string) {
    setBusyLock(true);
    setError("");
    try {
      const res = await fetch(`/api/deposits/${id}/cancel`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo cancelar.");
        return;
      }
      setPendingDeposits((current) => current.filter((row) => row.id !== id));
      setToast("Aporte cancelado.");
    } finally {
      setBusyLock(false);
    }
  }

  const byType = new Map(wallets.map((wallet) => [wallet.type, wallet]));
  const gasto = byType.get("gasto");
  const hasPending = pending.length > 0 || pendingDeposits.length > 0;

  return (
    <section className="yo-rise-1 flex h-full flex-col rounded-[1.75rem] bg-card p-5 shadow-[0_12px_40px_rgba(109,76,255,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold leading-tight">Mis Huchas</h2>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={busyLock}
            onClick={openAportar}
            className="inline-flex items-center gap-1 rounded-xl bg-[#12a35a] px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            <ArrowDownLeft className="size-4" aria-hidden />
            Aportar
          </button>
          <button
            type="button"
            disabled={busyLock || (gasto?.availableMinor ?? 0) <= 0}
            onClick={openTransferir}
            className="inline-flex items-center gap-1 rounded-xl bg-[#0055ff] px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            Invertir
            <ArrowUpRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <div className="mt-3 grid flex-1 items-stretch gap-2.5 sm:grid-cols-3">
        {ORDER.map((type) => {
          const wallet = byType.get(type) ?? { type, balanceMinor: 0, reservedMinor: 0, availableMinor: 0 };
          const meta = WALLET_META[type];
          return (
            <article key={type} className={`relative flex h-full flex-col rounded-2xl p-3.5 ${meta.tone}`}>
              {busyLock ? <div className="absolute inset-0 z-10 rounded-2xl bg-white/50" aria-hidden /> : null}
              <div className="flex items-center gap-1.5">
                <div className="shrink-0 opacity-80">{meta.icon}</div>
                <p className="text-[10px] font-bold uppercase leading-tight tracking-wide opacity-80">{WALLET_LABELS[type]}</p>
              </div>
              <p className="mt-3 text-center text-2xl font-extrabold leading-none text-foreground">{pesos(wallet.availableMinor)}</p>
              {wallet.reservedMinor > 0 ? (
                <p className="mt-2 text-center text-xs font-bold">Pediste {pesos(wallet.reservedMinor)}</p>
              ) : null}
              <div className="mt-auto pt-5">
                <button
                  type="button"
                  disabled={busyLock || wallet.availableMinor <= 0}
                  onClick={() => openRetirar(type)}
                  className="w-full rounded-xl border border-foreground/15 bg-white/70 px-2 py-2.5 text-sm font-bold disabled:opacity-40"
                >
                  Retirar
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {hasPending ? (
        <div className="mt-4 rounded-2xl border border-line bg-[#f8f5ff] p-4">
          <h3 className="text-sm font-extrabold">Pedidos a tu Banquero</h3>
          <ul className="mt-2 grid gap-2">
            {pendingDeposits.map((row) => (
              <li key={`deposit-${row.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-bold">
                    Aporte {pesos(row.amountMinor)} · {WALLET_LABELS[row.walletType]}
                  </p>
                  {row.note ? <p className="truncate text-sm text-muted">{row.note}</p> : <p className="text-sm text-muted">Esperando que lo reciba</p>}
                </div>
                <button type="button" disabled={busyLock} onClick={() => cancelAporte(row.id)} className="shrink-0 text-sm font-bold text-red-800 disabled:opacity-50">
                  Cancelar
                </button>
              </li>
            ))}
            {pending.map((row) => (
              <li key={`withdrawal-${row.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
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
        <p role="status" className="mihucha-toast fixed top-20 right-6 z-50 max-w-xs rounded-2xl border border-white/15 bg-foreground/60 px-4 py-3 text-sm font-bold text-background shadow-lg backdrop-blur-md">
          {toast}
        </p>
      ) : null}

      {action === "retirar" && focus ? (
        <MoneyModal
          title={`Retirar de ${WALLET_LABELS[focus]}`}
          hint={
            focus === "donaciones"
              ? "Este dinero es para ayudar. Tu Banquero te lo entrega. Mientras tanto queda reservado."
              : "Tu Banquero te entrega el billete. Mientras tanto, ese monto queda reservado."
          }
          max={byType.get(focus)?.availableMinor ?? 0}
          noteField={focus === "donaciones" ? "¿A quién ayuda?" : "¿Para qué? (opcional)"}
          noteRequired={false}
          busy={busyLock}
          error={error}
          onClearError={() => setError("")}
          onClose={close}
          onSubmit={onRetirar}
          confirmLabel="Pedir a mi Banquero"
        />
      ) : null}

      {action === "transferir" ? (
        <MoneyModal
          title="Pasar a Inversión"
          hint="Solo desde Gasto hacia Inversión. Así tu plata puede crecer."
          max={gasto?.availableMinor ?? 0}
          busy={busyLock}
          error={error}
          onClearError={() => setError("")}
          onClose={close}
          onSubmit={(amount) => onTransferir(amount)}
          confirmLabel="Transferir"
        />
      ) : null}

      {action === "aportar" ? (
        <AportarModal
          busy={busyLock}
          error={error}
          onClearError={() => setError("")}
          onClose={close}
          onSubmit={onAportar}
        />
      ) : null}
    </section>
  );
}

function AportarModal({
  busy,
  error,
  onClearError,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  error: string;
  onClearError: () => void;
  onClose: () => void;
  onSubmit: (walletType: WalletType, amount: number, note: string) => Promise<void>;
}) {
  const titleId = useId();
  const [walletType, setWalletType] = useState<WalletType>("gasto");
  const [amount, setAmount] = useState("");
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
    const parsed = parsePesosInput(amount);
    if (!parsed.ok) {
      setLocalError(parsed.error === "Escribe un monto." ? "Escribe cuánto quieres aportar." : parsed.error);
      return;
    }
    await onSubmit(walletType, parsed.value, note.trim());
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-foreground/40 px-6" role="presentation" onClick={() => { if (!busy) onClose(); }}>
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
          <h2 id={titleId} className="text-2xl font-extrabold leading-tight">
            Aportar a una Hucha
          </h2>
          <button type="button" disabled={busy} onClick={onClose} className="text-sm font-bold text-muted disabled:opacity-50" aria-label="Cerrar">
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">
          Si te regalaron plata, elige a qué Hucha va. Tu Banquero confirma cuando la reciba.
        </p>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold">¿A qué Hucha?</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {APORTAR_WALLETS.map((type) => {
              const on = walletType === type;
              return (
                <button
                  key={type}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    clearErrors();
                    setWalletType(type);
                  }}
                  className={`rounded-2xl border-2 px-2 py-3 text-center text-xs font-extrabold disabled:opacity-50 ${
                    on ? "border-accent bg-[#efe9ff] text-accent" : "border-line bg-white"
                  }`}
                >
                  {WALLET_LABELS[type]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="mt-4 block text-sm font-bold">
          Monto
          <input
            inputMode="numeric"
            autoComplete="off"
            value={amount}
            onChange={(event) => {
              clearErrors();
              setAmount(formatPesosGrouped(event.target.value));
            }}
            placeholder="5.000"
            aria-invalid={Boolean(shownError)}
            className={`mt-1.5 w-full rounded-2xl border bg-white px-4 py-3 font-normal ${shownError ? "border-red-700" : "border-line"}`}
          />
        </label>
        <label className="mt-3 block text-sm font-bold">
          ¿De quién / de dónde? (opcional)
          <input
            value={note}
            onChange={(event) => {
              clearErrors();
              setNote(event.target.value);
            }}
            placeholder="Salvador me regaló"
            className="mt-1.5 w-full rounded-2xl border border-line bg-white px-4 py-3 font-normal"
          />
        </label>
        {shownError ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {shownError}
          </p>
        ) : null}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="submit" disabled={busy} className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
            Avisar a mi Banquero
          </button>
          <button type="button" disabled={busy} onClick={onClose} className="rounded-2xl border border-foreground/20 px-4 py-3 font-bold disabled:opacity-50">
            Cancelar
          </button>
        </div>
      </form>
    </div>,
    document.body,
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
  const [amount, setAmount] = useState(max > 0 ? formatPesosGrouped(max) : "");
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
    const parsed = parsePesosInput(amount);
    if (!parsed.ok) {
      setLocalError(parsed.error === "Escribe un monto." ? "Escribe cuánto quieres mover." : parsed.error);
      return;
    }
    if (parsed.value > max) {
      setLocalError(`Solo puedes usar hasta ${pesos(max)}.`);
      return;
    }
    if (noteRequired && !note.trim()) {
      setLocalError("Cuéntanos para qué es.");
      return;
    }
    await onSubmit(parsed.value, note.trim());
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-foreground/40 px-6" role="presentation" onClick={() => { if (!busy) onClose(); }}>
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
          <h2 id={titleId} className="text-2xl font-extrabold leading-tight">
            {title}
          </h2>
          <button type="button" disabled={busy} onClick={onClose} className="text-sm font-bold text-muted disabled:opacity-50" aria-label="Cerrar">
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">{hint}</p>
        <p className="mt-1 text-sm font-bold">Disponible: {pesos(max)}</p>
        <label className="mt-5 block text-sm font-bold">
          Monto
          <input
            inputMode="numeric"
            autoComplete="off"
            value={amount}
            onChange={(event) => {
              clearErrors();
              const next = formatPesosGrouped(event.target.value);
              const parsed = parsePesosInput(next);
              if (parsed.ok && parsed.value > max) {
                setAmount(formatPesosGrouped(max));
                return;
              }
              setAmount(next);
            }}
            aria-invalid={Boolean(shownError)}
            className={`mt-1.5 w-full rounded-2xl border bg-white px-4 py-3 font-normal ${shownError ? "border-red-700" : "border-line"}`}
          />
        </label>
        {noteField ? (
          <label className="mt-3 block text-sm font-bold">
            {noteField}
            <input
              value={note}
              onChange={(event) => {
                clearErrors();
                setNote(event.target.value);
              }}
              className="mt-1.5 w-full rounded-2xl border border-line bg-white px-4 py-3 font-normal"
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
    </div>,
    document.body,
  );
}

function Spinner() {
  return <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />;
}
