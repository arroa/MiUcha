import Link from "next/link";
import { redirect } from "next/navigation";

import { ChildShell } from "@/components/child-shell";
import { GoalForm } from "@/components/goal-form";
import { getChildSession } from "@/lib/child-account";

export default async function NuevoObjetivoPage() {
  const child = await getChildSession();
  if (!child) redirect("/entrar");

  return (
    <ChildShell>
      <Link href="/yo/objetivos" className="text-sm font-bold text-accent">
        ← Mis objetivos
      </Link>
      <div className="mx-auto mt-4 max-w-2xl">
        <GoalForm mode="create" />
      </div>
    </ChildShell>
  );
}
