import { ObjectId } from "mongodb";

import { getAdultSession } from "@/lib/adult-session";
import { adults, children, families, wallets, type AdultRole, type WalletType } from "@/lib/collections";
import { deleteClerkUser, ensureClerkUser, normalizeEmail } from "@/lib/clerk-users";
import { familyNameKey } from "@/lib/family-name";
import { hashPin, pinProblem, verifyPin } from "@/lib/pin";
import { assignChildToActiveTips } from "@/lib/tips";

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

export async function requireFamilyAdult() {
  const session = await getAdultSession();
  if (!session?.familyId || !session.adultId) return null;
  if (session.role !== "banquero" && session.role !== "auditor") return null;
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

export async function createFamily(input: { banqueroName: string; banqueroEmail: string }) {
  const banqueroName = input.banqueroName.trim();
  const email = normalizeEmail(input.banqueroEmail);
  if (!banqueroName || !isEmail(email)) throw new Error("Completa el nombre y el correo del banquero.");

  const existing = await (await adults()).findOne({ email });
  if (existing) throw new Error("Ese correo ya es adulto de una familia.");

  const clerkUserId = await ensureClerkUser(email, banqueroName);
  const familyId = new ObjectId();
  const adultId = new ObjectId();
  const now = new Date();

  await (await families()).insertOne({
    _id: familyId,
    name: "",
    nameKey: "",
    loginAttempts: 0,
    loginLockedUntil: null,
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

  return { id: familyId.toHexString(), name: "" };
}

export async function renameFamilyCard(familyId: string, input: unknown) {
  if (!ObjectId.isValid(familyId)) throw new Error("Familia no encontrada.");
  const json = (input ?? {}) as { name?: string; banqueroName?: string };
  const name = json.name?.trim() ?? "";
  const banqueroName = json.banqueroName?.trim() ?? "";
  if (name.length > 80) throw new Error("El nombre de la familia es demasiado largo.");
  if (!banqueroName || banqueroName.length > 80) throw new Error("Ponle un nombre al banquero, de hasta 80 caracteres.");

  const family = await (await families()).findOne({ _id: new ObjectId(familyId) });
  if (!family) throw new Error("Familia no encontrada.");
  const banquero = await (await adults()).findOne({ _id: family.banqueroId, role: "banquero" });
  if (!banquero) throw new Error("Banquero no encontrado.");

  await saveFamilyName(family._id, name);
  await (await adults()).updateOne({ _id: banquero._id }, { $set: { name: banqueroName } });
  await ensureClerkUser(banquero.email, banqueroName);
  return { id: family._id.toHexString(), name, banqueroName, banqueroEmail: banquero.email };
}

export function percentagesAreValid(pctInversion: number, pctGasto: number, pctDonaciones: number) {
  return [pctInversion, pctGasto, pctDonaciones].every((value) => Number.isInteger(value) && value >= 0 && value <= 100) &&
    pctInversion + pctGasto + pctDonaciones === 100;
}

export async function updateFamilyParameters(input: {
  familyId: string;
  name: string;
  pctInversion: number;
  pctGasto: number;
  pctDonaciones: number;
  interestPercent: number;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Ponle un nombre a la familia.");
  if (name.length > 80) throw new Error("El nombre de la familia es demasiado largo.");
  if (!percentagesAreValid(input.pctInversion, input.pctGasto, input.pctDonaciones)) {
    throw new Error("Los porcentajes de Inversión, Gasto y Donaciones tienen que sumar 100.");
  }
  if (!Number.isInteger(input.interestPercent) || input.interestPercent < 0 || input.interestPercent > 100) {
    throw new Error("La tasa de interés es un número entero entre 0 y 100.");
  }
  await saveFamilyName(new ObjectId(input.familyId), name, {
    pctInversion: input.pctInversion,
    pctGasto: input.pctGasto,
    pctDonaciones: input.pctDonaciones,
    interestPercent: input.interestPercent,
  });
}

async function saveFamilyName(familyId: ObjectId, name: string, extra: Record<string, number> = {}) {
  const nameKey = familyNameKey(name);
  if (nameKey) {
    const taken = await (await families()).findOne({ nameKey, _id: { $ne: familyId } });
    if (taken) throw new Error("Ya hay una familia con ese nombre.");
  }
  try {
    await (await families()).updateOne({ _id: familyId }, { $set: { name, nameKey, ...extra } });
  } catch (error) {
    if (isDuplicateKey(error)) throw new Error("Ya hay una familia con ese nombre.");
    throw error;
  }
}

function isDuplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: number }).code === 11000;
}

async function assertPinAvailable(familyId: ObjectId, pin: string, exceptChildId?: ObjectId) {
  const problem = pinProblem(pin);
  if (problem) throw new Error(problem);
  const rows = await (await children()).find(exceptChildId ? { familyId, _id: { $ne: exceptChildId } } : { familyId }).toArray();
  for (const row of rows) {
    if (await verifyPin(pin, row.pinHash)) throw new Error("Ese PIN ya lo usa otro niño de esta familia.");
  }
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
    throw new Error("Completa el nombre, la fecha de nacimiento y el nombre en la casa.");
  }
  if (!/^[a-z0-9._-]{3,24}$/.test(loginId)) {
    throw new Error("El nombre en la casa usa letras minúsculas, números, punto o guion, de 3 a 24 caracteres.");
  }
  if (input.gender !== "nino" && input.gender !== "nina") throw new Error("Indica si es niño o niña.");

  const now = new Date();
  const childId = new ObjectId();
  const familyId = new ObjectId(input.familyId);
  const taken = await (await children()).findOne({ familyId, loginId });
  if (taken) throw new Error("En esta familia ya usan ese nombre en la casa.");
  await assertPinAvailable(familyId, input.pin);
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
  await assignChildToActiveTips(familyId, childId);
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
  return { id: childId.toHexString(), name, gender: input.gender, birthDate: input.birthDate, loginId };
}

export async function updateChildAccount(familyId: string, childId: string, input: unknown) {
  if (!ObjectId.isValid(childId)) throw new Error("Niño no encontrado.");
  const json = (input ?? {}) as { name?: string; gender?: string; birthDate?: string; loginId?: string; pin?: string };
  const name = json.name?.trim() ?? "";
  const loginId = json.loginId?.trim().toLowerCase() ?? "";
  const birthDate = json.birthDate?.trim() ?? "";
  if (!name || name.length > 80 || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    throw new Error("Completa el nombre, la fecha de nacimiento y el nombre en la casa.");
  }
  if (!/^[a-z0-9._-]{3,24}$/.test(loginId)) {
    throw new Error("El nombre en la casa usa letras minúsculas, números, punto o guion, de 3 a 24 caracteres.");
  }
  if (json.gender !== "nino" && json.gender !== "nina") throw new Error("Indica si es niño o niña.");
  const pin = json.pin?.trim() ?? "";

  const col = await children();
  const familyObjectId = new ObjectId(familyId);
  const child = await col.findOne({ _id: new ObjectId(childId), familyId: familyObjectId, active: true });
  if (!child) throw new Error("Niño no encontrado.");
  const taken = await col.findOne({ familyId: familyObjectId, loginId, _id: { $ne: child._id } });
  if (taken) throw new Error("En esta familia ya usan ese nombre en la casa.");
  if (pin) await assertPinAvailable(familyObjectId, pin, child._id);

  const fields: {
    name: string;
    gender: "nino" | "nina";
    birthDate: string;
    loginId: string;
    pinHash?: string;
    pinAttempts?: number;
    pinLockedUntil?: Date | null;
  } = { name, gender: json.gender, birthDate, loginId };
  if (pin) {
    fields.pinHash = await hashPin(pin);
    fields.pinAttempts = 0;
    fields.pinLockedUntil = null;
  }
  await col.updateOne({ _id: child._id }, { $set: fields });
  return { id: child._id.toHexString(), name, gender: json.gender, birthDate, loginId };
}

export async function deactivateChild(familyId: string, childId: string) {
  if (!ObjectId.isValid(childId)) throw new Error("Niño no encontrado.");
  const result = await (await children()).updateOne(
    { _id: new ObjectId(childId), familyId: new ObjectId(familyId), active: true },
    { $set: { active: false } },
  );
  if (!result.matchedCount) throw new Error("Niño no encontrado.");
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
  const _id = new ObjectId();
  await col.insertOne({
    _id,
    familyId: new ObjectId(input.familyId),
    role: "auditor" satisfies AdultRole,
    name,
    email,
    clerkUserId,
    active: true,
    createdAt: now,
  });
  return { id: _id.toHexString(), name, email };
}

export async function updateAuditorAccount(familyId: string, auditorId: string, input: unknown) {
  if (!ObjectId.isValid(auditorId)) throw new Error("Auditor no encontrado.");
  const json = (input ?? {}) as { name?: string; email?: string };
  const name = json.name?.trim() ?? "";
  const email = normalizeEmail(json.email ?? "");
  if (!name || name.length > 80 || !isEmail(email)) throw new Error("Completa el nombre y el correo del auditor.");

  const col = await adults();
  const familyObjectId = new ObjectId(familyId);
  const auditor = await col.findOne({ _id: new ObjectId(auditorId), familyId: familyObjectId, role: "auditor" });
  if (!auditor) throw new Error("Auditor no encontrado.");
  const taken = await col.findOne({ email, _id: { $ne: auditor._id } });
  if (taken) throw new Error("Ese correo ya es adulto de una familia.");

  const clerkUserId = await ensureClerkUser(email, name);
  if (clerkUserId !== auditor.clerkUserId) await deleteClerkUser(auditor.clerkUserId);
  await col.updateOne({ _id: auditor._id }, { $set: { name, email, clerkUserId } });
  return { id: auditor._id.toHexString(), name, email };
}

export async function removeAuditor(familyId: string, auditorId: string) {
  if (!ObjectId.isValid(auditorId)) throw new Error("Auditor no encontrado.");
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




