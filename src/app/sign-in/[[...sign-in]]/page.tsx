import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SignInForm } from "@/components/sign-in-form";
import { getAdultSession } from "@/lib/adult-session";
import { getAppUser } from "@/lib/current-user";
import { isDevBypassEnabled } from "@/lib/dev-flags";

export default function SignInPage() {
  return (
    <Suspense fallback={<p className="grid min-h-full place-items-center text-muted">Cargando…</p>}>
      <SignInGate />
    </Suspense>
  );
}

async function SignInGate() {
  const adult = await getAdultSession();
  if (adult) redirect("/novedades");
  const app = await getAppUser();
  if (app) redirect("/sin-acceso");

  return (
    <SignInForm
      devBypass={isDevBypassEnabled()}
      clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}
    />
  );
}
