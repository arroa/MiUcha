import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

import { acceso } from "@/lib/acceso.config";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { verifyDevSessionToken } from "@/lib/dev-session";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  via: "dev" | "clerk";
};

function hasClerkKeys() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

export async function getAppUser(): Promise<AppUser | null> {
  if (isDevBypassEnabled()) {
    const store = await cookies();
    const raw = store.get(acceso.cookieDev)?.value;
    if (raw) {
      const userId = await verifyDevSessionToken(raw);
      if (userId) {
        const email = userId.replace(/^dev:/, "");
        return { id: userId, email, name: email.split("@")[0] || "Dev", via: "dev" };
      }
    }
  }

  if (!hasClerkKeys()) return null;

  const { userId } = await auth().catch(() => ({ userId: null as string | null }));
  if (!userId) return null;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
  if (!email) return null;
  return {
    id: userId,
    email,
    name: user?.firstName || email.split("@")[0] || "Adulto",
    via: "clerk",
  };
}
