import { AdultSignOut } from "@/components/sign-out";
import { getAppUser } from "@/lib/current-user";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function SinAccesoPage() {
  return (
    <Suspense fallback={<p className="grid min-h-full place-items-center">Cargando…</p>}>
      <SinAcceso />
    </Suspense>
  );
}

async function SinAcceso() {
  const app = await getAppUser();
  if (!app) redirect("/sign-in");
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-6">
      <h1 className="font-serif text-4xl">Todavía no tienes una familia</h1>
      <p className="mt-3 text-muted">
        {process.env.MONGODB_URI?.trim()
          ? "El superusuario crea la familia y al banquero. Cuando tu correo esté ahí, esta puerta se abre."
          : "Este correo entró. Falta MONGODB_URI en .env.local para reconocer banqueros y auditores. Si eres el superusuario, pon el mismo correo en SUPER_ADMIN_EMAIL."}
      </p>
      <div className="mt-6">
        <AdultSignOut via={app.via} />
      </div>
    </main>
  );
}
