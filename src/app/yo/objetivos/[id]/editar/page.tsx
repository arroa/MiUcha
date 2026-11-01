import Link from "next/link";
import { redirect } from "next/navigation";
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
      <Link href={`/yo/objetivos/${id}`} className="text-sm font-bold text-accent">
        ← Volver
      </Link>
      <div className="mx-auto mt-4 max-w-2xl">
        <GoalForm mode="edit" initial={goal} />
      </div>
    </ChildShell>
  );
}
