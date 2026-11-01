import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ChildShell } from "@/components/child-shell";
import { GoalForm } from "@/components/goal-form";
import { getChildSession } from "@/lib/child-account";

export default function NuevoObjetivoPage() {
  return (
    <Suspense fallback={<p className="yo-soft p-8 text-muted">Cargando…</p>}>
      <NuevoObjetivo />
    </Suspense>
  );
}

async function NuevoObjetivo() {
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
