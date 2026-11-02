import Link from "next/link";
import { redirect } from "next/navigation";
import { Home, Pencil, Plus, Star } from "lucide-react";
import { Suspense } from "react";

import { ChildShell } from "@/components/child-shell";
import { getChildSession } from "@/lib/child-account";
import { goalIconDef } from "@/lib/goal-icons";
import { listGoalsForChild, type GoalView } from "@/lib/goals";

function pesos(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`;
}

export default function ObjetivosPage() {
  return (
    <Suspense fallback={<p className="yo-soft p-8 text-muted">Cargando…</p>}>
      <Objetivos />
    </Suspense>
  );
}

async function Objetivos() {
  const child = await getChildSession();
  if (!child) redirect("/entrar");

  const [{ goals: active, availableForGoals }, { goals: achieved }] = await Promise.all([
    listGoalsForChild(child, "active"),
    listGoalsForChild(child, "achieved"),
  ]);
  const favorite = active.find((goal) => goal.isFavorite) ?? null;
  const others = active.filter((goal) => !goal.isFavorite);

  return (
    <ChildShell>
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/yo"
          className="inline-flex items-center gap-1.5 rounded-2xl border border-line bg-card px-3 py-2 text-sm font-bold shadow-sm"
        >
          <Home className="size-4 text-accent" aria-hidden />
          Inicio
        </Link>
        <Link
          href="/yo/objetivos/nuevo"
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-2 text-xs font-extrabold text-white"
        >
          <Plus className="size-3.5" aria-hidden />
          Nuevo
        </Link>
      </div>

      <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">Mis objetivos</h1>
      <p className="mt-1 text-sm text-muted">
        Disponible para conseguirlos: <span className="font-bold text-[#12a35a]">{pesos(availableForGoals)}</span>
        <span className="block text-xs">(Gasto + Inversión · Generosidad no cuenta)</span>
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:items-start">
        <section>
          <h2 className="text-sm font-extrabold">Activos</h2>
          {active.length === 0 ? (
            <div className="mt-3 rounded-3xl border border-dashed border-line bg-card px-5 py-8 text-center">
              <p className="font-extrabold">Todavía no tienes objetivos</p>
              <Link href="/yo/objetivos/nuevo" className="mt-3 inline-block text-sm font-bold text-accent">
                Crear el primero →
              </Link>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {favorite ? (
                <li>
                  <GoalCatalogCard goal={favorite} principal />
                </li>
              ) : null}
              {others.map((goal) => (
                <li key={goal.id}>
                  <GoalCatalogCard goal={goal} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm font-extrabold">Conseguidos</h2>
          {achieved.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Cuando marques un objetivo como conseguido, aparece aquí.</p>
          ) : (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {achieved.map((goal) => {
                const Icon = goalIconDef(goal.iconId).Icon;
                const when = goal.completedAt
                  ? new Date(goal.completedAt).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })
                  : "";
                return (
                  <li key={goal.id}>
                    <Link href={`/yo/objetivos/${goal.id}`} className="block rounded-3xl bg-gradient-to-br from-[#efe9ff] to-white p-4 text-center shadow-sm">
                      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-accent">
                        <Icon className="size-6" aria-hidden />
                      </span>
                      <p className="mt-2 truncate text-sm font-extrabold">{goal.name}</p>
                      {when ? <p className="mt-1 text-[11px] text-muted">{when}</p> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </ChildShell>
  );
}

function GoalCatalogCard({ goal, principal = false }: { goal: GoalView; principal?: boolean }) {
  const Icon = goalIconDef(goal.iconId).Icon;
  return (
    <article
      className={`rounded-3xl border p-4 shadow-sm ${
        principal ? "border-accent/40 bg-gradient-to-br from-[#efe9ff] to-card" : "border-line bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <Link
          href={`/yo/objetivos/${goal.id}`}
          className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#efe9ff] text-accent"
          aria-label={`Ver ${goal.name}`}
        >
          <Icon className="size-6" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/yo/objetivos/${goal.id}`} className="min-w-0 truncate text-lg font-extrabold hover:text-accent">
              {goal.name}
            </Link>
            {goal.isFavorite ? <Star className="size-4 shrink-0 fill-accent text-accent" aria-label="Favorito" /> : null}
          </div>
          {principal ? <p className="text-xs font-bold uppercase tracking-wide text-accent">Principal</p> : null}
          <p className="text-sm text-muted">
            {goal.progressPercent}% · falta {pesos(goal.missingMinor)}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ebe4ff]">
            <div className="h-full rounded-full bg-accent" style={{ width: `${goal.progressPercent}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/yo/objetivos/${goal.id}/editar`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-sm font-bold"
            >
              <Pencil className="size-3.5" aria-hidden />
              Editar
            </Link>
            <Link href={`/yo/objetivos/${goal.id}`} className="inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-bold text-accent">
              Ver →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
