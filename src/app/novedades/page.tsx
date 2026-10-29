import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { FamilyAdmin } from "@/components/family-admin";
import { AdultSignOut } from "@/components/sign-out";
import { TaskReview } from "@/components/task-review";
import { getAdultSession, mongoIsConfigured } from "@/lib/adult-session";
import { listFamilies } from "@/lib/family-admin";

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
  const databaseReady = mongoIsConfigured();
  const familyRows = adult.isSuperAdmin && databaseReady ? await listFamilies() : [];
  const ownsFamily = familyRows.some((family) => family.banqueroEmail === adult.email);

  return (
    <main className="mx-auto min-h-full max-w-3xl px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-accent">{role}</p>
          <h1 className="mt-1 font-serif text-4xl break-all">{adult.email}</h1>
        </div>
        <AdultSignOut via={adult.via} />
      </header>
      {ownsFamily ? (
        <Link href="/familia" className="mt-6 inline-block rounded-2xl border border-accent px-5 py-3 font-bold text-accent">
          Entrar como banquero
        </Link>
      ) : null}
      {adult.isSuperAdmin ? (
        <div className="mt-8">
          {databaseReady ? null : (
            <p className="mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Para ver y guardar familias escribe <code>MONGODB_URI</code> en <code>.env.local</code>.
            </p>
          )}
          <FamilyAdmin
            isSuperAdmin
            selfEmail={adult.email}
            selfName={adult.name}
            families={familyRows}
            family={null}
            children={[]}
            auditors={[]}
            tips={[]}
          />
        </div>
      ) : adult.role === "banquero" ? (
        <Link href="/familia" className="mt-8 inline-block rounded-2xl bg-accent px-5 py-3 font-bold text-white">
          Familia
        </Link>
      ) : null}
      {adult.role === "auditor" || adult.role === "banquero" ? (
        <section className="mt-8">
          <h2 className="font-serif text-3xl">Novedades</h2>
          <p className="mt-2 text-sm text-muted">Tareas que los niños dijeron que hicieron.</p>
          <div className="mt-4">
            <TaskReview />
          </div>
        </section>
      ) : null}
    </main>
  );
}
