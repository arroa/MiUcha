import { adults, families, type Adult, type Family } from "@/lib/collections";
import { getAppUser, type AppUser } from "@/lib/current-user";

export type AdultSession = AppUser & {
  isSuperAdmin: boolean;
  role: Adult["role"] | null;
  familyId: string | null;
  adultId: string | null;
};

export function getSuperAdminEmail(): string {
  return (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
}

export function mongoIsConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI?.trim() && process.env.MONGODB_DB_NAME?.trim());
}

export async function getAdultSession(): Promise<AdultSession | null> {
  const app = await getAppUser();
  if (!app?.email) return null;

  const email = app.email.trim().toLowerCase();
  const isSuperAdmin = Boolean(getSuperAdminEmail()) && email === getSuperAdminEmail();
  if (!mongoIsConfigured()) {
    if (!isSuperAdmin) return null;
    return { ...app, email, isSuperAdmin: true, role: null, familyId: null, adultId: null };
  }
  const adult = await (await adults()).findOne({ email, active: true });

  if (!isSuperAdmin && !adult) return null;

  return {
    ...app,
    email,
    isSuperAdmin,
    role: adult?.role ?? null,
    familyId: adult ? adult.familyId.toHexString() : null,
    adultId: adult ? adult._id.toHexString() : null,
  };
}

export async function familyForAdult(session: AdultSession): Promise<Family | null> {
  if (!session.familyId) return null;
  const { ObjectId } = await import("mongodb");
  return (await families()).findOne({ _id: new ObjectId(session.familyId) });
}
