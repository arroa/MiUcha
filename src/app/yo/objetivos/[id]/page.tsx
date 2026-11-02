import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, Target } from "lucide-react";
import { Suspense } from "react";

import { ChildShell } from "@/components/child-shell";
import { GoalDetailActions } from "@/components/goal-detail-actions";
import { getChildSession } from "@/lib/child-account";
import { goalIconDef } from "@/lib/goal-icons";
import { getGoalForChild, goalMotivation } from "@/lib/goals";
import { walletsSnapshot } from "@/lib/money";

function pesos(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`;
}

type Params = { params: Promise<{ id: string }> };

export default function ObjetivoDetallePage({ params }: Params) {
  return (
    <Suspense fallback={<p className="yo-soft p-8 text-muted">Cargando…</p>}>
      <ObjetivoDetalle params={params} />
    </Suspense>
  );
}

async function ObjetivoDetalle({ params }: Params) {
  const child = await getChildSession();
  if (!child) redirect("/entrar");
  const { id } = await params;

  let goal;
  try {
    goal = await getGoalForChild(child, id);
  } catch {
    redirect("/yo/objetivos");
  }

  const wallets = await walletsSnapshot(child.familyId, child._id);
  const Icon = goalIconDef(goal.iconId).Icon;
  const message = goalMotivation(goal);

  return (
    <ChildShell>
      <Link
        href="/yo/objetivos"
        className="inline-flex items-center gap-1.5 rounded-2xl border border-line bg-card px-3 py-2 text-sm font-bold shadow-sm"
      >
        <Target className="size-4 text-accent" aria-hidden />
        Mis objetivos
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className="rounded-[1.75rem] bg-card p-5 shadow-[0_12px_40px_rgba(109,76,255,0.12)] sm:p-7">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            {goal.status === "achieved" ? "Conseguido" : goal.status === "discarded" ? "Descartado" : goal.isFavorite ? "Favorito" : "Objetivo"}
          </p>
          <div className="mt-3 flex items-start justify-between gap-3">
            <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{goal.name}</h1>
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#efe9ff] text-accent sm:size-20">
              <Icon className="size-8 sm:size-10" aria-hidden />
            </span>
          </div>
          {goal.description ? <p className="mt-3 text-sm text-muted sm:text-base">{goal.description}</p> : null}

          {goal.status === "active" ? (
            <>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted">Precio</p>
                  <p className="mt-0.5 text-sm font-extrabold sm:text-base">{pesos(goal.targetAmountMinor)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted">Disponible</p>
                  <p className="mt-0.5 text-sm font-extrabold text-[#12a35a] sm:text-base">{pesos(goal.availableForGoals)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted">Falta</p>
                  <p className="mt-0.5 text-sm font-extrabold text-accent sm:text-base">{pesos(goal.missingMinor)}</p>
                </div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#ebe4ff]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#8b6cff] to-accent" style={{ width: `${goal.progressPercent}%` }} />
              </div>
              <p className="mt-2 text-right text-xs font-bold text-accent">{goal.progressPercent}%</p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#efe9ff] px-3 py-1 text-xs font-bold text-[#5b45c4]">
                <Sparkles className="size-3.5" aria-hidden />
                {message}
              </p>
            </>
          ) : null}
        </section>

        <div>
          <GoalDetailActions goal={goal} wallets={wallets} />
        </div>
      </div>
    </ChildShell>
  );
}
