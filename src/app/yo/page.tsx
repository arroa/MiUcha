import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ChildSignOut } from "@/components/sign-out";
import { getChildSession, walletsForChild } from "@/lib/child-account";

const labels = {
  inversion: "Inversión",
  gasto: "Gasto",
  donaciones: "Donaciones",
} as const;

export default function YoPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Cargando…</p>}>
      <Yo />
    </Suspense>
  );
}

async function Yo() {
  const child = await getChildSession();
  if (!child) redirect("/entrar");
  const rows = await walletsForChild(child);

  return (
    <main className="mx-auto min-h-full max-w-3xl px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-5xl">¡Hola, {child.name}!</h1>
        <ChildSignOut />
      </header>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {rows.map((wallet) => (
          <article key={wallet.type} className="rounded-3xl border border-line bg-card p-5">
            <p className="text-sm text-muted">{labels[wallet.type]}</p>
            <p className="mt-2 font-serif text-4xl">${wallet.balanceMinor.toLocaleString("es-CL")}</p>
          </article>
        ))}
      </div>
      <p className="mt-8 text-muted">Cuando hagas un Tip y un adulto lo apruebe, estas Uchas van a crecer.</p>
    </main>
  );
}
