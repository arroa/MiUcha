import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ChildSignIn } from "@/components/child-sign-in";
import { getChildSession } from "@/lib/child-account";

export default function EntrarPage() {
  return (
    <Suspense fallback={<p className="grid min-h-full place-items-center text-muted">Cargando…</p>}>
      <EntrarGate />
    </Suspense>
  );
}

async function EntrarGate() {
  const child = await getChildSession();
  if (child) redirect("/yo");
  return <ChildSignIn />;
}
