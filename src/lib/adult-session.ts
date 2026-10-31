import { adults, families, type Adult, type AdultRole, type Family } from "@/lib/collections";
import { getAppUser, type AppUser } from "@/lib/current-user";
import { readFamilyChoice } from "@/lib/family-choice";

export type AdultMembership = {
  adultId: string;
  familyId: string;
  role: AdultRole;
  name: string;
};

export type AdultSession = AppUser & {
  isSuperAdmin: boolean;
  memberships: AdultMembership[];
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
    return { ...app, email, isSuperAdmin: true, memberships: [], role: null, familyId: null, adultId: null };
  }
  const rows = await (await adults()).find({ email, active: true }).sort({ createdAt: 1 }).toArray();
  const memberships: AdultMembership[] = rows.map((adult) => ({
    adultId: adult._id.toHexString(),
    familyId: adult.familyId.toHexString(),
    role: adult.role,
    name: adult.name,
  }));

  if (!isSuperAdmin && memberships.length === 0) return null;

  const chosen = await readFamilyChoice();
  const current = memberships.find((item) => item.familyId === chosen) ?? (memberships.length === 1 ? memberships[0] : null);

  return {
    ...app,
    email,
    isSuperAdmin,
    memberships,
    role: current?.role ?? null,
    familyId: current?.familyId ?? null,
    adultId: current?.adultId ?? null,
  };
}

export function homeForAdult(adult: AdultSession): string {
  if (adult.isSuperAdmin || adult.memberships.length > 1) return "/panel";
  if (adult.memberships.length === 1) return "/familia";
  return "/sin-acceso";
}

export async function familyForAdult(session: AdultSession): Promise<Family | null> {
  if (!session.familyId) return null;
  const { ObjectId } = await import("mongodb");
  return (await families()).findOne({ _id: new ObjectId(session.familyId) });
}
