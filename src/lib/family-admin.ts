import { ObjectId } from "mongodb";

import { getAdultSession } from "@/lib/adult-session";
import { adults, children, families, wallets, type AdultRole, type WalletType } from "@/lib/collections";
import { deleteClerkUser, ensureClerkUser, normalizeEmail } from "@/lib/clerk-users";
import { hashPin, isPin } from "@/lib/pin";

const WALLET_TYPES: WalletType[] = ["inversion", "gasto", "donaciones"];

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function requireSuperAdmin() {
  const session = await getAdultSession();
  if (!session?.isSuperAdmin) return null;
  return session;
}

export async function requireBanquero() {
  const session = await getAdultSession();
  if (!session || session.role !== "banquero" || !session.familyId) return null;
  return session;
}

export async function listFamilies() {
  const rows = await (await families()).find({}).sort({ createdAt: -1 }).toArray();
  const people = await (await adults()).find({ role: "banquero" }).toArray();
  const byId = new Map(people.map((person) => [person._id.toHexString(), person]));
  return rows.map((family) => {
    const banquero = byId.get(family.banqueroId.toHexString());
    return {
      id: family._id.toHexString(),
      name: family.name,
      banqueroName: banquero?.name ?? "",
      banqueroEmail: banquero?.email ?? "",
    };
  });
}

export async function createFamily(input: { name: string; banqueroName: string; banqueroEmail: string }) {
  const name = input.name.trim();
  const banqueroName = input.banqueroName.trim();
  const email = normalizeEmail(input.banqueroEmail);
  if (!name || !banqueroName || !isEmail(email)) throw new Error("Completa el nombre de la familia, y el nombre y correo del banquero.");

  const existing = await (await adults()).findOne({ email });
  if (existing) throw new Error("Ese correo ya es adulto de una familia.");

  const clerkUserId = await ensureClerkUser(email, banqueroName);
  const familyId = new ObjectId();
  const adultId = new ObjectId();
  const now = new Date();

  await (await families()).insertOne({
    _id: familyId,
    name,
    banqueroId: adultId,
    pctInversion: 50,
    pctGasto: 40,
    pctDonaciones: 10,
    interestPercent: 0,
    timezone: "America/Santiago",
    currency: "CLP",
    createdAt: now,
  });
  await (await adults()).insertOne({
    _id: adultId,
    familyId,
    role: "banquero",
    name: banqueroName,
    email,
    clerkUserId,
    active: true,
    createdAt: now,
  });

  return { id: familyId.toHexString(), name };
}

export function percentagesAreValid(pctInversion: number, pctGasto: number, pctDonaciones: number) {
  return [pctInversion, pctGasto, pctDonaciones].every((value) => Number.isInteger(value) && value >= 0 && value <= 100) &&
    pctInversion + pctGasto + pctDonaciones === 100;
}

export async function updateFamilyParameters(input: {
  familyId: string;
  pctInversion: number;
  pctGasto: number;
  pctDonaciones: number;
  interestPercent: number;
}) {
  if (!percentagesAreValid(input.pctInversion, input.pctGasto, input.pctDonaciones)) {
    throw new Error("Los porcentajes de Inversión, Gasto y Donaciones tienen que sumar 100.");
  }
  if (!Number.isInteger(input.interestPercent) || input.interestPercent < 0 || input.interestPercent > 100) {
    throw new Error("La tasa de interés es un número entero entre 0 y 100.");
  }
  await (await families()).updateOne(
    { _id: new ObjectId(input.familyId) },
    {
      $set: {
        pctInversion: input.pctInversion,
        pctGasto: input.pctGasto,
        pctDonaciones: input.pctDonaciones,
        interestPercent: input.interestPercent,
      },
    },
  );
}

export async function createChildAccount(input: {
  familyId: string;
  name: string;
  gender: "nino" | "nina";
  birthDate: string;
  loginId: string;
  pin: string;
}) {
  const name = input.name.trim();
  const loginId = input.loginId.trim().toLowerCase();
  if (!name || !loginId || !/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) {
    throw new Error("Completa nombre, fecha de nacimiento e identificador.");
  }
  if (!/^[a-z0-9._-]{3,24}$/.test(loginId)) {
    throw new Error("El identificador usa letras minúsculas, números, punto o guion, de 3 a 24 caracteres.");
  }
  if (!isPin(input.pin)) throw new Error("El PIN son 6 números.");
  if (input.gender !== "nino" && input.gender !== "nina") throw new Error("Indica si es niño o niña.");

  const taken = await (await children()).findOne({ loginId });
  if (taken) throw new Error("Ese identificador ya está usado.");

  const now = new Date();
  const childId = new ObjectId();
  const familyId = new ObjectId(input.familyId);
  await (await children()).insertOne({
    _id: childId,
    familyId,
    name,
    gender: input.gender,
    birthDate: input.birthDate,
    loginId,
    pinHash: await hashPin(input.pin),
    pinAttempts: 0,
    pinLockedUntil: null,
    active: true,
    createdAt: now,
  });
  await (await wallets()).insertMany(
    WALLET_TYPES.map((type) => ({
      _id: new ObjectId(),
      familyId,
      childId,
      type,
      balanceMinor: 0,
      updatedAt: now,
    })),
  );
  return { id: childId.toHexString(), name, loginId };
}

export async function createAuditorAccount(input: { familyId: string; name: string; email: string }) {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (!name || !isEmail(email)) throw new Error("Completa el nombre y el correo del auditor.");
  const col = await adults();
  const existing = await col.findOne({ email });
  if (existing) throw new Error("Ese correo ya es adulto de una familia.");

  const clerkUserId = await ensureClerkUser(email, name);
  const now = new Date();
  await col.insertOne({
    _id: new ObjectId(),
    familyId: new ObjectId(input.familyId),
    role: "auditor" satisfies AdultRole,
    name,
    email,
    clerkUserId,
    active: true,
    createdAt: now,
  });
}

export async function removeAuditor(familyId: string, auditorId: string) {
  const col = await adults();
  const auditor = await col.findOne({
    _id: new ObjectId(auditorId),
    familyId: new ObjectId(familyId),
    role: "auditor",
  });
  if (!auditor) throw new Error("Auditor no encontrado.");
  await deleteClerkUser(auditor.clerkUserId);
  await col.deleteOne({ _id: auditor._id });
}
