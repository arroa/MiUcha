import { cookies } from "next/headers";
import { ObjectId } from "mongodb";

export const FAMILY_COOKIE = "miucha_familia";

export async function readFamilyChoice(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(FAMILY_COOKIE)?.value ?? "";
  return ObjectId.isValid(value) ? value : null;
}

export function familyChoiceCookie(familyId: string) {
  return {
    name: FAMILY_COOKIE,
    value: familyId,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}
