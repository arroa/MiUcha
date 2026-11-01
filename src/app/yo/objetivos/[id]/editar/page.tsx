import Link from "next/link";
import { redirect } from "next/navigation";

import { ChildShell } from "@/components/child-shell";
import { GoalForm } from "@/components/goal-form";
import { getChildSession } from "@/lib/child-account";
import { getGoalForChild } from "@/lib/goals";

type Params = { params: Promise<{ id: string }> };

export default async function EditarObjetivoPage({ params }: Params) {
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
