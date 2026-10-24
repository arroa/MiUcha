import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdultSignOut } from "@/components/sign-out";
import { getAdultSession } from "@/lib/adult-session";

export default function NovedadesPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Cargando…</p>}>
      <Novedades />
    </Suspense>
  );
}

async function Novedades() {
  const adult = await getAdultSession();
  if (!adult) redirect("/sign-in");

  const role = adult.isSuperAdmin ? "Superusuario" : adult.role === "banquero" ? "Banquero" : "Auditor";

  return (
    <main className="mx-auto min-h-full max-w-3xl px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-muted uppercase">{role}</p>
          <h1 className="font-serif text-4xl">Novedades</h1>
        </div>
        <AdultSignOut via={adult.via} />
      </header>
      <p className="mt-6 text-muted">Cuando un niño marque un Tip o pida plata, va a aparecer aquí.</p>
      {adult.isSuperAdmin || adult.role === "banquero" ? (
        <Link href="/familia" className="mt-8 inline-block rounded-2xl bg-accent px-5 py-3 font-bold text-white">
          Familia
        </Link>
      ) : null}
    </main>
  );
}
