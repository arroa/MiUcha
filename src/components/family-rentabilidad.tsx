"use client";

import { useEffect, useState } from "react";

import { UI_TOAST_DURATION_MS } from "@/lib/ui";

type DayRow = { date: string; balanceMinor: number; interestMinor: number };
type ChildPreview = {
  childId: string;
  childName: string;
  paid: boolean;
  paidAt: string | null;
  paidMinor: number | null;
  calculatedMinor: number;
  discretionaryMinor: number | null;
  interestPercent: number;
  days: DayRow[];
};
type Preview = {
  periodKey: string;
  periodLabel: string;
  partial: boolean;
  daysIncluded: number;
  lastDayIncluded: string | null;
  interestPercent: number;
  children: ChildPreview[];
  nag: { show: boolean; periodKey: string; periodLabel: string; pendingCount: number };
  selectablePeriods: { periodKey: string; periodLabel: string; partial: boolean }[];
};

function pesos(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`;
}

/** `2026-10-04` → `Dom 04` */
function weekdayDayLabel(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = new Intl.DateTimeFormat("es-CL", { weekday: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
  const short = weekday.slice(0, 3);
  const name = short.charAt(0).toUpperCase() + short.slice(1).toLowerCase();
  return `${name} ${String(day).padStart(2, "0")}`;
}

export function FamilyRentabilidad({
  visible,
  initialChildId,
  onOpenSection,
}: {
  visible: boolean;
  initialChildId?: string | null;
  onOpenSection?: () => void;
}) {
  const [periodKey, setPeriodKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(initialChildId ?? null);
  const [discretionary, setDiscretionary] = useState("0");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [nagOpen, setNagOpen] = useState(false);
  const [nagSeen, setNagSeen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), UI_TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const query = periodKey ? `?period=${encodeURIComponent(periodKey)}` : "";
    fetch(`/api/rentabilidad${query}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { rentabilidad?: Preview; error?: string } | null;
        if (!active) return;
        if (!res.ok || !data?.rentabilidad) {
          setError(data?.error ?? "No se pudo cargar la rentabilidad.");
          setPreview(null);
          return;
        }
        setPreview(data.rentabilidad);
        setPeriodKey(data.rentabilidad.periodKey);
        if (!nagSeen && data.rentabilidad.nag.show) setNagOpen(true);
        if (initialChildId) setSelectedChildId(initialChildId);
        else if (!selectedChildId && data.rentabilidad.children[0]) {
          setSelectedChildId(data.rentabilidad.children.find((c) => !c.paid)?.childId ?? data.rentabilidad.children[0].childId);
        }
      })
      .catch(() => {
        if (active) setError("No se pudo cargar la rentabilidad.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when period changes; child selection is local
  }, [periodKey, nagSeen, initialChildId]);

  const selected = preview?.children.find((child) => child.childId === selectedChildId) ?? null;
  const discretionaryMinor = Number.parseInt(discretionary, 10);
  const discretionaryOk = Number.isInteger(discretionaryMinor);
  const totalMinor = selected && discretionaryOk ? Math.max(0, selected.calculatedMinor + discretionaryMinor) : null;

  useEffect(() => {
    if (!selected || selected.paid) return;
    setDiscretionary("0");
  }, [selected?.childId, selected?.paid, preview?.periodKey]);

  async function settle() {
    if (!preview || !selected || selected.paid || !discretionaryOk || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/rentabilidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: selected.childId,
          periodKey: preview.periodKey,
          discretionaryMinor,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; rentabilidad?: { paidMinor: number; childName: string } } | null;
      if (!res.ok || !data?.rentabilidad) {
        setError(data?.error ?? "No se pudo abonar la rentabilidad.");
        return;
      }
      setConfirmOpen(false);
      setToast(`Rentabilidad de ${pesos(data.rentabilidad.paidMinor)} abonada a ${data.rentabilidad.childName}.`);
      setPeriodKey(preview.periodKey);
      // force reload
      const refreshed = await fetch(`/api/rentabilidad?period=${encodeURIComponent(preview.periodKey)}`);
      const body = (await refreshed.json().catch(() => null)) as { rentabilidad?: Preview } | null;
      if (body?.rentabilidad) setPreview(body.rentabilidad);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    {visible ? (
    <section className="scroll-mt-36 rounded-3xl border border-line bg-card p-5 sm:p-6">
      <h2 className="font-serif text-3xl">Rentabilidad</h2>
      <p className="mt-1 text-sm text-muted">
        Interés simple sobre el saldo diario de Inversión (tasa mensual ÷ 30). Puedes abonar cualquier día; el mes en curso usa solo los días ya cerrados.
      </p>

      {loading ? <p className="mt-6 text-sm text-muted">Calculando…</p> : null}
      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {preview ? (
        <div className="mt-5 grid gap-4">
          <div className={`grid gap-3 ${preview.children.length > 1 ? "sm:grid-cols-2" : ""}`}>
            <label className="block text-sm">
              Mes
              <select
                value={preview.periodKey}
                onChange={(event) => setPeriodKey(event.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-line bg-white px-4 py-3"
              >
                {preview.selectablePeriods.map((period) => (
                  <option key={period.periodKey} value={period.periodKey}>
                    {period.periodLabel}
                    {period.partial ? " (parcial)" : ""}
                  </option>
                ))}
              </select>
            </label>
            {preview.children.length > 1 ? (
              <label className="block text-sm">
                Niño
                <select
                  value={selectedChildId ?? ""}
                  onChange={(event) => setSelectedChildId(event.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-line bg-white px-4 py-3"
                >
                  {preview.children.map((child) => (
                    <option key={child.childId} value={child.childId}>
                      {child.childName}
                      {child.paid ? " · pagado" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          {preview.partial ? (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Si abonas el mes en curso ahora, queda cerrado: no se sumarán los días que faltan.
            </p>
          ) : null}

          {selected ? (
            <div className="rounded-3xl border border-line bg-white p-4">
              <h3 className="font-serif text-2xl">{selected.childName}</h3>
              <p className="mt-2 text-sm text-muted">
                Tasa usada: <span className="font-bold text-foreground">{selected.interestPercent}% mensual</span>
                <span> · diaria ≈ {(selected.interestPercent / 30).toFixed(4)}%</span>
              </p>
              {selected.paid ? (
                <p className="mt-2 text-sm text-muted">
                  Ya abonaste este mes ({pesos(selected.paidMinor ?? 0)}
                  {selected.discretionaryMinor ? ` · ajuste ${pesos(selected.discretionaryMinor)}` : ""}). No se puede volver a pagar.
                </p>
              ) : null}
              <div className="mt-4 max-h-56 overflow-auto rounded-2xl border border-line">
                <table className="w-full table-fixed text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr>
                      <th className="w-1/3 border-r border-line/60 px-3 py-2 text-center font-bold">Día</th>
                      <th className="w-1/3 border-r border-line/60 px-3 py-2 pr-6 text-center font-bold">Saldo de Día</th>
                      <th className="w-1/3 px-3 py-2 pr-6 text-center font-bold">Interés</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.days.map((day) => (
                      <tr key={day.date} className="border-t border-line">
                        <td className="border-r border-line/60 px-3 py-1.5 text-center">{weekdayDayLabel(day.date)}</td>
                        <td className="border-r border-line/60 py-1.5 pl-3 pr-6 text-right tabular-nums">{pesos(day.balanceMinor)}</td>
                        <td className="py-1.5 pl-3 pr-6 text-right tabular-nums">{pesos(day.interestMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selected.paid ? (
                <p className="mt-4 text-sm">
                  Calculado: <span className="font-bold">{pesos(selected.calculatedMinor)}</span>
                  <span className="text-muted"> · congelado al abonar</span>
                </p>
              ) : (
                <>
                  <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1.2fr] sm:items-stretch">
                    <div className="rounded-2xl border border-line bg-[#f8f5ff] px-4 py-3 text-center">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted">Calculado</p>
                      <p className="mt-1 font-serif text-2xl tabular-nums">{pesos(selected.calculatedMinor)}</p>
                    </div>
                    <p className="hidden items-center justify-center text-xl font-bold text-muted sm:flex" aria-hidden>
                      +
                    </p>
                    <label className="rounded-2xl border border-line bg-white px-4 py-3 text-center">
                      <span className="block text-xs font-bold uppercase tracking-wide text-muted">¿Desea agregar más?</span>
                      <input
                        inputMode="numeric"
                        value={discretionary}
                        onChange={(event) => setDiscretionary(event.target.value)}
                        placeholder="0"
                        aria-label="Monto adicional en pesos"
                        className="mt-1 w-full bg-transparent text-center font-serif text-2xl tabular-nums outline-none placeholder:text-muted/50"
                      />
                    </label>
                    <p className="hidden items-center justify-center text-xl font-bold text-muted sm:flex" aria-hidden>
                      =
                    </p>
                    <div className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-center">
                      <p className="text-xs font-bold uppercase tracking-wide text-accent">Total a abonar</p>
                      <p className="mt-1 font-serif text-2xl font-bold tabular-nums text-accent">
                        {totalMinor === null ? "—" : pesos(totalMinor)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!discretionaryOk || busy}
                    onClick={() => setConfirmOpen(true)}
                    className="mt-4 w-full rounded-2xl bg-accent py-3 font-bold text-white disabled:opacity-50"
                  >
                    Abonar rentabilidad
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
    ) : null}

      {nagOpen && preview?.nag.show ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-6" role="presentation" onClick={() => { setNagOpen(false); setNagSeen(true); }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rentabilidad-nag"
            className="relative w-full max-w-md rounded-3xl bg-card p-8 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="absolute right-4 top-4 text-sm font-bold text-muted" aria-label="Cerrar" onClick={() => { setNagOpen(false); setNagSeen(true); }}>
              ✕
            </button>
            <h2 id="rentabilidad-nag" className="pr-8 font-serif text-3xl">
              Tienes que abonar la rentabilidad
            </h2>
            <p className="mt-4 text-lg text-muted">
              Falta {preview.nag.pendingCount === 1 ? "1 niño" : `${preview.nag.pendingCount} niños`} de {preview.nag.periodLabel}. ¿Vamos?
            </p>
            <button
              type="button"
              className="mt-6 w-full rounded-2xl bg-accent py-3 font-bold text-white"
              onClick={() => {
                setNagOpen(false);
                setNagSeen(true);
                setPeriodKey(preview.nag.periodKey);
                onOpenSection?.();
              }}
            >
              Continuar
            </button>
            <button type="button" className="mt-3 w-full rounded-2xl border border-line py-3 font-bold" onClick={() => { setNagOpen(false); setNagSeen(true); }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {confirmOpen && selected && preview && totalMinor !== null ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-6" role="presentation" onClick={() => { if (!busy) setConfirmOpen(false); }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rentabilidad-confirm"
            className="relative w-full max-w-md rounded-3xl bg-card p-8 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            {busy ? <div className="absolute inset-0 z-10 grid place-items-center rounded-3xl bg-card/70" aria-busy="true"><p className="text-sm font-bold text-muted">Abonando…</p></div> : null}
            <button type="button" disabled={busy} className="absolute right-4 top-4 text-sm font-bold text-muted disabled:opacity-50" aria-label="Cerrar" onClick={() => setConfirmOpen(false)}>
              ✕
            </button>
            <h2 id="rentabilidad-confirm" className="pr-8 font-serif text-3xl">
              ¿Abonar {pesos(totalMinor)}?
            </h2>
            <p className="mt-4 text-lg text-muted">
              Se suma a la Inversión de {selected.childName} por {preview.periodLabel}
              {preview.partial ? " (parcial)" : ""}. Este mes quedará marcado como pagado.
            </p>
            <button type="button" disabled={busy} onClick={() => void settle()} className="mt-6 w-full rounded-2xl bg-accent py-3 font-bold text-white disabled:opacity-50">
              {busy ? "Abonando…" : "Continuar"}
            </button>
            <button type="button" disabled={busy} className="mt-3 w-full rounded-2xl border border-line py-3 font-bold disabled:opacity-50" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <p role="status" className="mihucha-toast fixed top-6 right-6 z-[60] max-w-xs rounded-2xl border border-white/15 bg-foreground/60 px-4 py-3 text-sm font-bold text-background shadow-lg backdrop-blur-md">
          {toast}
        </p>
      ) : null}
    </>
  );
}
