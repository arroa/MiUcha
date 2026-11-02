import Link from "next/link";
import { redirect } from "next/navigation";
import { Target } from "lucide-react";
import { Suspense } from "react";

import { ChildShell } from "@/components/child-shell";
import { GoalForm } from "@/components/goal-form";
import { getChildSession } from "@/lib/child-account";
import { getGoalForChild } from "@/lib/goals";

type Params = { params: Promise<{ id: string }> };

export default function EditarObjetivoPage({ params }: Params) {
  return (
    <Suspense fallback={<p className="yo-soft p-8 text-muted">Cargando…</p>}>
      <EditarObjetivo params={params} />
    </Suspense>
  );
}

async function EditarObjetivo({ params }: Params) {
  const child = await getChildSession();
  if (!child) redirect("/entrar");
  const { id } = await params;

  let goal;
  try {
    goal = await getGoalForChild(child, id);
  } catch {
    redirect("/yo/objetivos");
  }
  if (goal.status !== "active") redirect(`/yo/objetivos/${id}`);

  return (
    <ChildShell>
      <Link
        href="/yo/objetivos"
        className="inline-flex items-center gap-1.5 rounded-2xl border border-line bg-card px-3 py-2 text-sm font-bold shadow-sm"
      >
        <Target className="size-4 text-accent" aria-hidden />
        Mis objetivos
      </Link>
      <div className="mx-auto mt-4 max-w-2xl">
        <GoalForm mode="edit" initial={goal} />
      </div>
    </ChildShell>
  );
}
