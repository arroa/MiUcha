import type { ChildMovement } from "@/lib/child-feed";

const WALLET_LABELS = {
  inversion: "Inversión",
  gasto: "Gasto",
  donaciones: "Donaciones",
} as const;

function pesos(amount: number) {
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
  return `${sign}$${Math.abs(amount).toLocaleString("es-CL")}`;
}

export function ChildMovements({ rows }: { rows: ChildMovement[] }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-3xl">Cartola</h2>
      <p className="mt-1 text-sm text-muted">Tus movimientos de Uchas.</p>
      {rows.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-line bg-card px-5 py-8 text-center">
          <p className="font-serif text-2xl">Todavía vacía</p>
          <p className="mt-1 text-sm text-muted">Cuando ganes tips, pases plata o retires, aparece aquí.</p>
        </div>
      ) : (
        <ul className="mt-4 max-h-[28rem] overflow-auto rounded-3xl border border-line bg-card px-4">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-3 border-b border-line/80 py-3 last:border-0">
              <div className="min-w-0">
                <p className="truncate font-bold">{row.label}</p>
                <p className="truncate text-sm capitalize text-muted">
                  {row.when} · {WALLET_LABELS[row.walletType]}
                </p>
              </div>
              <p className={`shrink-0 font-serif text-xl ${row.amountMinor >= 0 ? "text-accent" : ""}`}>{pesos(row.amountMinor)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
