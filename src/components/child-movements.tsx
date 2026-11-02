"use client";

import { Heart, ShoppingCart, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import type { ChildMovement } from "@/lib/child-feed";
import { periodKeyFromIso, periodLabelEs, santiagoToday } from "@/lib/santiago-date";

type PeriodOption = { periodKey: string; label: string };

function pesos(amount: number) {
  if (amount === 0) return "—";
  const sign = amount > 0 ? "+" : "−";
  return `${sign}$${Math.abs(amount).toLocaleString("es-CL")}`;
}

function amountClass(amount: number) {
  if (amount === 0) return "text-muted";
  if (amount > 0) return "text-[#12a35a]";
  return "text-foreground";
}

export function ChildMovements({
  initialRows,
  initialPeriodKey,
  periods,
}: {
  initialRows: ChildMovement[];
  initialPeriodKey?: string;
  periods: PeriodOption[];
}) {
  const fallbackPeriod = initialPeriodKey ?? periodKeyFromIso(santiagoToday().date);
  const [periodKey, setPeriodKey] = useState(fallbackPeriod);
  const [rows, setRows] = useState(initialRows);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setRows(initialRows);
    setPeriodKey(fallbackPeriod);
  }, [initialRows, fallbackPeriod]);

  async function loadPeriod(next: string) {
    if (next === periodKey) return;
    setBusy(true);
    setError("");
    setPeriodKey(next);
    try {
      const res = await fetch(`/api/movements?period=${encodeURIComponent(next)}`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { movements?: ChildMovement[]; error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudieron cargar los movimientos.");
        return;
      }
      setRows(Array.isArray(data?.movements) ? data.movements : []);
    } catch {
      setError("No se pudieron cargar los movimientos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="yo-rise-3">
      <h3 className="text-2xl font-extrabold leading-tight">Qué pasó con mi plata</h3>
      <p className="mt-0.5 text-sm text-muted">Cada Tip o movimiento, con el reparto en tus Huchas.</p>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className={`mt-4 overflow-auto rounded-3xl border border-line bg-card shadow-sm ${busy ? "opacity-60" : ""}`}>
        <table className="w-full min-w-[22rem] table-fixed border-collapse text-left">
          <colgroup>
            <col />
            <col className="w-20" />
            <col className="w-20" />
            <col className="w-20" />
          </colgroup>
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="px-3 py-2.5">
                <label className="sr-only" htmlFor="movimientos-mes">
                  Mes
                </label>
                <select
                  id="movimientos-mes"
                  value={periodKey}
                  disabled={busy}
                  onChange={(event) => void loadPeriod(event.target.value)}
                  className="w-full max-w-full cursor-pointer rounded-xl border border-accent/25 bg-[#efe9ff] px-2.5 py-1.5 text-sm font-bold text-accent shadow-sm disabled:opacity-50"
                >
                  {periods.map((period) => (
                    <option key={period.periodKey} value={period.periodKey}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </th>
              <th className="px-1 py-2.5 text-center" title="Inversión">
                <span className="sr-only">Inversión</span>
                <TrendingUp className="mx-auto size-4 text-[#0d7a45]" aria-hidden />
              </th>
              <th className="px-1 py-2.5 text-center" title="Gasto">
                <span className="sr-only">Gasto</span>
                <ShoppingCart className="mx-auto size-4 text-[#c2345a]" aria-hidden />
              </th>
              <th className="px-1 py-2.5 text-center" title="Generosidad">
                <span className="sr-only">Generosidad</span>
                <Heart className="mx-auto size-4 text-[#a66b00]" aria-hidden />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center">
                  <p className="text-xl font-extrabold">Todavía vacía</p>
                  <p className="mt-1 text-sm text-muted">
                    {periodKey === periodKeyFromIso(santiagoToday().date)
                      ? "Cuando ganes Tips, pases plata o retires, aparece aquí."
                      : `En ${periodLabelEs(periodKey)} no hay movimientos.`}
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-line/80 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-bold">{row.label}</p>
                    <p className="text-sm capitalize text-muted">{row.when}</p>
                  </td>
                  <td className={`px-1 py-3 text-center text-sm font-extrabold tabular-nums ${amountClass(row.inversionMinor)}`}>
                    {pesos(row.inversionMinor)}
                  </td>
                  <td className={`px-1 py-3 text-center text-sm font-extrabold tabular-nums ${amountClass(row.gastoMinor)}`}>
                    {pesos(row.gastoMinor)}
                  </td>
                  <td className={`px-1 py-3 text-center text-sm font-extrabold tabular-nums ${amountClass(row.donacionesMinor)}`}>
                    {pesos(row.donacionesMinor)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
