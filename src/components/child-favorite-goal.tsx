import Link from "next/link";
import { ExternalLink, Plus, Target } from "lucide-react";

import { goalIconDef } from "@/lib/goal-icons";
import type { GoalView } from "@/lib/goals";

function pesos(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`;
}

/** Atajo al favorito. Descripción y tienda viven aquí; el detalle completo en /yo/objetivos/[id]. */
export function ChildFavoriteGoal({
  favorite,
  hasActiveGoals,
}: {
  favorite: GoalView | null;
  hasActiveGoals: boolean;
}) {
  if (!favorite) {
    return (
      <section className="yo-rise flex h-full flex-col rounded-[1.75rem] bg-card p-5 shadow-[0_12px_40px_rgba(109,76,255,0.12)]">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Mi objetivo favorito</p>
        <div className="mt-3 flex flex-1 items-start gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#efe9ff] text-accent">
            <Target className="size-8" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold leading-tight">
              {hasActiveGoals ? "Elige tu favorito" : "¿Qué quieres conseguir?"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {hasActiveGoals
                ? "Marca uno como favorito en Mis objetivos."
                : "Guarda algo que quieras y mira cuánto te falta con tu plata de Gasto e Inversión."}
            </p>
          </div>
        </div>
        <Link
          href={hasActiveGoals ? "/yo/objetivos" : "/yo/objetivos/nuevo"}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(109,76,255,0.28)]"
        >
          <Plus className="size-4" aria-hidden />
          {hasActiveGoals ? "Ver mis objetivos" : "Crear mi primer objetivo"}
        </Link>
      </section>
    );
  }

  const Icon = goalIconDef(favorite.iconId).Icon;
  const detailHref = `/yo/objetivos/${favorite.id}`;
  const description = favorite.description.trim();

  return (
    <section className="yo-rise flex h-full flex-col rounded-[1.75rem] bg-card p-5 shadow-[0_12px_40px_rgba(109,76,255,0.12)] transition hover:shadow-[0_14px_44px_rgba(109,76,255,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={detailHref}
          className="min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2"
        >
          <h2 className="text-2xl font-extrabold leading-tight">{favorite.name}</h2>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted">Mi objetivo favorito</p>
        </Link>
        <div className="flex shrink-0 items-start gap-2">
          <Link
            href={detailHref}
            className="grid size-16 place-items-center rounded-2xl bg-accent text-white outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2"
            aria-label={`Ver ${favorite.name}`}
          >
            <Icon className="size-8" aria-hidden />
          </Link>
          {favorite.productUrl ? (
            <a
              href={favorite.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ver en tienda"
              className="grid size-10 place-items-center rounded-xl bg-[#e8f0ff] text-[#0055ff] outline-none transition hover:bg-[#d9e6ff] focus-visible:ring-2 focus-visible:ring-[#0055ff]/40 focus-visible:ring-offset-2"
            >
              <ExternalLink className="size-5" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>

      <Link
        href={detailHref}
        className="mt-4 flex min-h-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2"
      >
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] font-bold uppercase text-muted">Precio</p>
            <p className="mt-0.5 text-sm font-extrabold">{pesos(favorite.targetAmountMinor)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted">Disponible</p>
            <p className="mt-0.5 text-sm font-extrabold text-[#12a35a]">{pesos(favorite.availableForGoals)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted">Falta</p>
            <p className="mt-0.5 text-sm font-extrabold text-accent">{pesos(favorite.missingMinor)}</p>
          </div>
        </div>
        <div className="relative mt-4 h-7 overflow-hidden rounded-full bg-[#ebe4ff]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#8b6cff] to-accent transition-[width] duration-700"
            style={{ width: `${favorite.progressPercent}%` }}
          />
          <span
            className={`absolute inset-y-0 right-3 flex items-center text-xs font-extrabold tabular-nums ${
              favorite.progressPercent >= 85 ? "text-white" : "text-accent"
            }`}
          >
            {favorite.progressPercent}%
          </span>
        </div>
        {description ? <p className="mt-3 line-clamp-2 text-sm text-muted">{description}</p> : null}
      </Link>
    </section>
  );
}
