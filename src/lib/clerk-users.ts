import { createClerkClient } from "@clerk/backend";
import { randomBytes } from "crypto";

import { isDevBypassEnabled } from "@/lib/dev-flags";

function getClerk() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("Define CLERK_SECRET_KEY en .env.local");
  return createClerkClient({ secretKey });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isSkipPasswordDisallowed(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("errors" in error)) return false;
  const errors = (error as { errors?: { code?: string }[] }).errors;
  return errors?.some((item) => item.code === "form_conditional_param_disallowed") ?? false;
}

function splitDisplayName(displayName?: string): { firstName?: string; lastName?: string } {
  const trimmed = displayName?.trim() ?? "";
  if (!trimmed) return {};
  const [first, ...rest] = trimmed.split(/\s+/);
  const lastName = rest.join(" ").trim();
  return {
    firstName: first.slice(0, 50),
    ...(lastName ? { lastName: lastName.slice(0, 50) } : {}),
  };
}

export async function ensureClerkUser(email: string, displayName?: string): Promise<string> {
  const normalized = normalizeEmail(email);
  if (!process.env.CLERK_SECRET_KEY) {
    if (isDevBypassEnabled()) return `dev:${normalized}`;
    throw new Error("Define CLERK_SECRET_KEY en .env.local");
  }

  const clerk = getClerk();
  const names = splitDisplayName(displayName);
  const existing = await clerk.users.getUserList({ emailAddress: [normalized], limit: 1 });
  if (existing.data[0]) {
    if (names.firstName) await clerk.users.updateUser(existing.data[0].id, names);
    return existing.data[0].id;
  }

  try {
    const created = await clerk.users.createUser({
      emailAddress: [normalized],
      skipPasswordRequirement: true,
      skipLegalChecks: true,
      ...names,
    });
    return created.id;
  } catch (error) {
    if (!isSkipPasswordDisallowed(error)) throw error;
    const created = await clerk.users.createUser({
      emailAddress: [normalized],
      password: randomBytes(24).toString("base64url"),
      skipLegalChecks: true,
      ...names,
    });
    return created.id;
  }
}

export async function deleteClerkUser(clerkUserId: string) {
  if (!clerkUserId || clerkUserId.startsWith("dev:")) return;
  if (!process.env.CLERK_SECRET_KEY) return;
  try {
    await getClerk().users.deleteUser(clerkUserId);
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status !== 404) throw error;
  }
}

export function formatClerkError(error: unknown): string {
  if (error && typeof error === "object" && "errors" in error) {
    const errors = (error as { errors?: { longMessage?: string; message?: string }[] }).errors;
    if (errors?.length) return errors.map((item) => item.longMessage ?? item.message).join("; ");
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
