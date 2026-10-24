import type { Collection, ObjectId } from "mongodb";

import { getDb } from "@/lib/mongodb";

export type WalletType = "inversion" | "gasto" | "donaciones";

export type Family = {
  _id: ObjectId;
  name: string;
  banqueroId: ObjectId;
  pctInversion: number;
  pctGasto: number;
  pctDonaciones: number;
  interestPercent: number;
  timezone: "America/Santiago";
  currency: "CLP";
  createdAt: Date;
};

export type AdultRole = "banquero" | "auditor";

export type Adult = {
  _id: ObjectId;
  familyId: ObjectId;
  role: AdultRole;
  name: string;
  email: string;
  clerkUserId: string;
  active: boolean;
  createdAt: Date;
};

export type Child = {
  _id: ObjectId;
  familyId: ObjectId;
  name: string;
  gender: "nino" | "nina";
  birthDate: string;
  loginId: string;
  pinHash: string;
  pinAttempts: number;
  pinLockedUntil: Date | null;
  active: boolean;
  createdAt: Date;
};

export type Wallet = {
  _id: ObjectId;
  familyId: ObjectId;
  childId: ObjectId;
  type: WalletType;
  balanceMinor: number;
  updatedAt: Date;
};

let indexesReady: Promise<void> | null = null;

async function createIndexes() {
  const db = await getDb();
  await Promise.all([
    db.collection("adults").createIndex({ email: 1, familyId: 1 }, { unique: true }),
    db.collection("adults").createIndex({ clerkUserId: 1 }),
    db.collection("children").createIndex({ loginId: 1 }, { unique: true }),
    db.collection("children").createIndex({ familyId: 1 }),
    db.collection("wallets").createIndex({ familyId: 1, childId: 1, type: 1 }, { unique: true }),
  ]);
}

export async function ensureIndexes() {
  indexesReady ??= createIndexes();
  await indexesReady;
}

export async function families(): Promise<Collection<Family>> {
  await ensureIndexes();
  return (await getDb()).collection<Family>("families");
}

export async function adults(): Promise<Collection<Adult>> {
  await ensureIndexes();
  return (await getDb()).collection<Adult>("adults");
}

export async function children(): Promise<Collection<Child>> {
  await ensureIndexes();
  return (await getDb()).collection<Child>("children");
}

export async function wallets(): Promise<Collection<Wallet>> {
  await ensureIndexes();
  return (await getDb()).collection<Wallet>("wallets");
}
