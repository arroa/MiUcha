import type { ChildMovement } from "@/lib/child-feed";
import { WALLET_LABELS } from "@/lib/wallet-labels";

function pesos(amount: number) {
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
  return `${sign}$${Math.abs(amount).toLocaleString("es-CL")}`;
}

export function ChildMovements({ rows }: { rows: ChildMovement[] }) {
  return (
    <section className="yo-rise-3">
      <h3 className="text-2xl font-extrabold leading-tight">Qué pasó con mi plata</h3>
      <p className="mt-0.5 text-sm text-muted">Tus movimientos de Huchas.</p>
      {rows.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-line bg-card px-5 py-8 text-center">
          <p className="text-xl font-extrabold">Todavía vacía</p>
          <p className="mt-1 text-sm text-muted">Cuando ganes Tips, pases plata o retires, aparece aquí.</p>
        </div>
      ) : (
        <ul className="mt-4 max-h-[28rem] overflow-auto rounded-3xl border border-line bg-card px-4 shadow-sm">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-3 border-b border-line/80 py-3 last:border-0">
              <div className="min-w-0">
                <p className="truncate font-bold">{row.label}</p>
                <p className="truncate text-sm capitalize text-muted">
                  {row.when} · {WALLET_LABELS[row.walletType]}
                </p>
              </div>
              <p className={`shrink-0 text-lg font-extrabold ${row.amountMinor >= 0 ? "text-[#12a35a]" : "text-foreground"}`}>{pesos(row.amountMinor)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
