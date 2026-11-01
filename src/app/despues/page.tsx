import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getAdultSession, homeForAdult } from "@/lib/adult-session";

export default function DespuesPage() {
  return (
    <Suspense fallback={<p className="grid min-h-full place-items-center text-muted">Entrando…</p>}>
      <DespuesGate />
    </Suspense>
  );
}

async function DespuesGate() {
  const adult = await getAdultSession();
  redirect(adult ? homeForAdult(adult) : "/sign-in");
  return null;
}
