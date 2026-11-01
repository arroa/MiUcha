"use client";

import Link from "next/link";
import { ExternalLink, Star, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { GoalBanqueroAsk } from "@/components/goal-banquero-ask";
import { productLinkLabel } from "@/lib/goal-url";
import type { GoalView } from "@/lib/goals";
import type { WalletView } from "@/lib/money";
import { UI_TOAST_DURATION_MS } from "@/lib/ui";

export function GoalDetailActions({ goal, wallets }: { goal: GoalView; wallets: WalletView[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [confirm, setConfirm] = useState<"discard" | "achieve" | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), UI_TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function run(path: string, successMessage: string, goList = false) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(path, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo completar la acción.");
        return;
      }
      setConfirm(null);
      setToast(successMessage);
      router.refresh();
      if (goList) {
        window.setTimeout(() => router.push("/yo/objetivos"), 500);
      }
    } finally {
      setBusy(false);
    }
  }

  if (goal.status !== "active") {
    return (
      <div className="space-y-3">
        {goal.productUrl ? <StoreLink url={goal.productUrl} /> : null}
        <Link href="/yo/objetivos" className="block text-center text-sm font-bold text-accent">
          ← Volver a mis objetivos
        </Link>
      </div>
    );
  }

  return (
    <div className="relative space-y-3">
      {busy ? <div className="absolute inset-0 z-10 rounded-3xl bg-white/50" aria-busy="true" /> : null}

      {goal.productUrl ? <StoreLink url={goal.productUrl} /> : null}

      <GoalBanqueroAsk goal={goal} initialWallets={wallets} />

      {!goal.isFavorite ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(`/api/goals/${goal.id}/favorite`, "Ahora es tu favorito.")}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-accent/30 bg-[#efe9ff] py-3 font-bold text-accent disabled:opacity-50"
        >
          <Star className="size-4" aria-hidden />
          Marcar como favorito
        </button>
      ) : (
        <p className="rounded-2xl bg-[#efe9ff] px-4 py-3 text-center text-sm font-bold text-accent">★ Este es tu favorito</p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => setConfirm("achieve")}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 font-extrabold text-white disabled:opacity-50"
      >
        <Trophy className="size-4" aria-hidden />
        ¡Lo conseguí!
      </button>

      <Link
        href={`/yo/objetivos/${goal.id}/editar`}
        className="block rounded-2xl border border-line bg-card py-3 text-center font-bold"
      >
        Editar
      </Link>

      <button
        type="button"
        disabled={busy}
        onClick={() => setConfirm("discard")}
        className="w-full py-2 text-sm font-bold text-red-800 disabled:opacity-50"
      >
        Descartar objetivo
      </button>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {confirm ? (
        <ConfirmModal
          title={confirm === "discard" ? "¿Descartar este objetivo?" : "¿Lo conseguiste de verdad?"}
          body={
            confirm === "discard"
              ? `Vas a sacar “${goal.name}” de tus objetivos activos. No se mueve plata; solo deja de aparecer en la lista.`
              : `Vas a guardar “${goal.name}” en tus logros. No se descuenta dinero automáticamente: si necesitas billete, pídelo a tu Banquero aparte.`
          }
          busy={busy}
          confirmLabel="Continuar"
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            confirm === "discard"
              ? run(`/api/goals/${goal.id}/discard`, "Objetivo descartado.", true)
              : run(`/api/goals/${goal.id}/achieve`, "¡Objetivo conseguido!", true)
          }
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

function StoreLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-[#efe9ff] text-accent">
        <ExternalLink className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold uppercase text-muted">Ver dónde comprarlo</span>
        <span className="block truncate font-bold">{productLinkLabel(url)}</span>
      </span>
    </a>
  );
}

function ConfirmModal({
  title,
  body,
  busy,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  busy: boolean;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-6" role="presentation" onClick={() => { if (!busy) onCancel(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm rounded-3xl bg-card p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        {busy ? <div className="absolute inset-0 z-10 rounded-3xl bg-white/55" aria-busy="true" /> : null}
        <button type="button" disabled={busy} onClick={onCancel} className="absolute right-4 top-4 text-sm font-bold text-muted disabled:opacity-50" aria-label="Cerrar">
          ✕
        </button>
        <h2 id={titleId} className="pr-8 text-xl font-extrabold">
          {title}
        </h2>
        <p className="mt-3 text-sm text-muted">{body}</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={onConfirm} className="rounded-2xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-50">
            {confirmLabel}
          </button>
          <button type="button" disabled={busy} onClick={onCancel} className="rounded-2xl border border-foreground/20 px-4 py-3 font-bold disabled:opacity-50">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
