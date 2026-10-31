import { redirect } from "next/navigation";
import { Suspense } from "react";

import { FamilyAdmin } from "@/components/family-admin";
import { AdultSignOut } from "@/components/sign-out";
import { getAdultSession, mongoIsConfigured } from "@/lib/adult-session";
import { listPanelFamilies } from "@/lib/family-admin";

export default function PanelPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Cargando…</p>}>
      <Panel />
    </Suspense>
  );
}

async function Panel() {
  const adult = await getAdultSession();
  if (!adult) redirect("/sign-in");

  if (!adult.isSuperAdmin && adult.memberships.length <= 1) {
    redirect(adult.memberships.length === 1 ? "/familia" : "/sin-acceso");
  }

  const role = adult.isSuperAdmin ? "Superusuario" : "Tus familias";
  const databaseReady = mongoIsConfigured();
  const familyRows = databaseReady ? await listPanelFamilies(adult) : [];

  return (
    <main className="mx-auto min-h-full max-w-3xl px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-accent">{role}</p>
          <h1 className="mt-1 font-serif text-4xl break-all">{adult.email}</h1>
        </div>
        <AdultSignOut via={adult.via} />
      </header>
      <div className="mt-8">
        {databaseReady ? null : (
          <p className="mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Para ver y guardar familias escribe <code>MONGODB_URI</code> en <code>.env.local</code>.
          </p>
        )}
        <FamilyAdmin
          isSuperAdmin={adult.isSuperAdmin}
          selfEmail={adult.email}
          selfName={adult.name}
          families={familyRows}
          family={null}
          children={[]}
          auditors={[]}
          tips={[]}
        />
      </div>
    </main>
  );
}
