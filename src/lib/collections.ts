import type { Collection, ObjectId } from "mongodb";

import { familyNameKey } from "@/lib/family-name";
import { getDb } from "@/lib/mongodb";
import type { WalletType } from "@/lib/wallet-labels";

export type { WalletType };

export type Family = {
  _id: ObjectId;
  name: string;
  nameKey: string;
  loginAttempts: number;
  loginLockedUntil: Date | null;
  banqueroId: ObjectId;
  pctInversion: number;
  pctGasto: number;
  pctDonaciones: number;
  /** Tasa mensual de Inversión. `10` es 10 %. Se aplica como tasa/30 sobre el saldo diario. */
  interestPercent?: number;
  /** Contador que sube con cada cambio visible entre adulto y niño. */
  syncVersion?: number;
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

export type TipFrequency = "once" | "daily" | "weekly";

export type TipOccurrenceStatus = "available" | "submitted" | "needs_improvement" | "approved" | "rejected";

export type TipOccurrence = {
  _id: ObjectId;
  familyId: ObjectId;
  childId: ObjectId;
  definitionId: ObjectId;
  occurrenceDate: string;
  title: string;
  amountMinor: number;
  status: TipOccurrenceStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewerId: ObjectId | null;
  reviewNote: string;
  /** Nota del Mejorable anterior, visible al adulto cuando el niño reintenta. */
  previousReviewNote?: string;
  newsReadAt?: Date | null;
  newsDismissedAt?: Date | null;
};

export type LedgerKind = "tip" | "transfer" | "withdrawal" | "deposit" | "interest" | "reversal";

export type LedgerEntry = {
  _id: ObjectId;
  familyId: ObjectId;
  childId: ObjectId;
  walletType: WalletType;
  amountMinor: number;
  kind: LedgerKind;
  operationId: string;
  actorId: string;
  createdAt: Date;
  newsReadAt?: Date | null;
  newsDismissedAt?: Date | null;
};

export type WithdrawalStatus = "pending" | "completed" | "cancelled";

export type WithdrawalRequest = {
  _id: ObjectId;
  familyId: ObjectId;
  childId: ObjectId;
  walletType: WalletType;
  amountMinor: number;
  note: string;
  status: WithdrawalStatus;
  createdAt: Date;
  completedAt: Date | null;
  banqueroId: ObjectId | null;
};

export type DepositStatus = "pending" | "completed" | "cancelled";

/** Plata externa que el niño aporta; el banquero confirma que la recibió. */
export type DepositRequest = {
  _id: ObjectId;
  familyId: ObjectId;
  childId: ObjectId;
  walletType: WalletType;
  amountMinor: number;
  note: string;
  status: DepositStatus;
  createdAt: Date;
  completedAt: Date | null;
  banqueroId: ObjectId | null;
};

export type TipDefinition = {
  _id: ObjectId;
  familyId: ObjectId;
  catalogKey?: string;
  title: string;
  amountMinor: number;
  frequency: TipFrequency;
  daysOfWeek: number[];
  assignedChildIds: ObjectId[];
  active: boolean;
  hidden?: boolean;
  startsOn: string | null;
  createdAt: Date;
};

/** Abono de rentabilidad mensual (o parcial) por niño. */
export type RentabilidadDaySnapshot = {
  date: string;
  balanceMinor: number;
  interestMinor: number;
};

export type RentabilidadPago = {
  _id: ObjectId;
  familyId: ObjectId;
  childId: ObjectId;
  periodKey: string;
  calculatedMinor: number;
  discretionaryMinor: number;
  paidMinor: number;
  partial: boolean;
  interestPercent: number;
  daysIncluded: number;
  /** Detalle diario congelado al abonar (auditable con la tasa usada). */
  days?: RentabilidadDaySnapshot[];
  operationId: string;
  paidBy: ObjectId;
  paidAt: Date;
};

export type GoalStatus = "active" | "achieved" | "discarded";

/** Objetivo personal: planificación/motivación. No reserva ni mueve dinero. */
export type ChildGoal = {
  _id: ObjectId;
  familyId: ObjectId;
  childId: ObjectId;
  name: string;
  description: string;
  targetAmountMinor: number;
  iconId: string;
  productUrl: string | null;
  status: GoalStatus;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

let indexesReady: Promise<void> | null = null;

async function dropIndexIfPresent(collection: Collection, name: string) {
  try {
    const indexes = await collection.indexes();
    if (indexes.some((index) => index.name === name)) await collection.dropIndex(name);
  } catch (error) {
    // Atlas: colección todavía no creada.
    if ((error as { code?: number }).code === 26) return;
    throw error;
  }
}

async function backfillFamilyNameKeys(collection: Collection<Family>) {
  const pending = await collection.find({ nameKey: { $exists: false } }).toArray();
  await Promise.all(
    pending.map((family) =>
      collection.updateOne(
        { _id: family._id },
        { $set: { nameKey: familyNameKey(family.name ?? ""), loginAttempts: family.loginAttempts ?? 0, loginLockedUntil: family.loginLockedUntil ?? null } },
      ),
    ),
  );
}

async function createIndexes() {
  const db = await getDb();
  const familyCollection = db.collection<Family>("families");
  const childCollection = db.collection("children");
  await backfillFamilyNameKeys(familyCollection);
  await dropIndexIfPresent(childCollection, "loginId_1");
  await dropIndexIfPresent(db.collection("adults"), "email_1");
  await Promise.all([
    db.collection("adults").createIndex({ email: 1, familyId: 1 }, { unique: true }),
    db.collection("adults").createIndex({ clerkUserId: 1 }),
    familyCollection.createIndex({ nameKey: 1 }, { unique: true, partialFilterExpression: { nameKey: { $gt: "" } } }),
    childCollection.createIndex({ familyId: 1, loginId: 1 }, { unique: true }),
    childCollection.createIndex({ familyId: 1 }),
    db.collection("wallets").createIndex({ familyId: 1, childId: 1, type: 1 }, { unique: true }),
    db.collection("tip_definitions").createIndex({ familyId: 1, active: 1 }),
    db.collection("tip_definitions").createIndex(
      { familyId: 1, catalogKey: 1 },
      { unique: true, partialFilterExpression: { catalogKey: { $type: "string" } } },
    ),
    db.collection("tip_occurrences").createIndex(
      { familyId: 1, childId: 1, definitionId: 1, occurrenceDate: 1 },
      { unique: true },
    ),
    db.collection("ledger_entries").createIndex({ operationId: 1, walletType: 1 }, { unique: true }),
    db.collection("withdrawal_requests").createIndex({ familyId: 1, status: 1, createdAt: -1 }),
    db.collection("withdrawal_requests").createIndex({ childId: 1, status: 1 }),
    db.collection("deposit_requests").createIndex({ familyId: 1, status: 1, createdAt: -1 }),
    db.collection("deposit_requests").createIndex({ childId: 1, status: 1 }),
    db.collection("child_goals").createIndex({ familyId: 1, childId: 1, status: 1, updatedAt: -1 }),
    db.collection("child_goals").createIndex(
      { childId: 1 },
      { unique: true, partialFilterExpression: { isFavorite: true, status: "active" } },
    ),
    db.collection("rentabilidad_pagos").createIndex({ familyId: 1, childId: 1, periodKey: 1 }, { unique: true }),
    db.collection("rentabilidad_pagos").createIndex({ familyId: 1, periodKey: 1 }),
  ]);
}

export async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = createIndexes().catch((error) => {
      indexesReady = null;
      throw error;
    });
  }
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

export async function tipDefinitions(): Promise<Collection<TipDefinition>> {
  await ensureIndexes();
  return (await getDb()).collection<TipDefinition>("tip_definitions");
}

export async function tipOccurrences(): Promise<Collection<TipOccurrence>> {
  await ensureIndexes();
  return (await getDb()).collection<TipOccurrence>("tip_occurrences");
}

export async function ledgerEntries(): Promise<Collection<LedgerEntry>> {
  await ensureIndexes();
  return (await getDb()).collection<LedgerEntry>("ledger_entries");
}

export async function withdrawalRequests(): Promise<Collection<WithdrawalRequest>> {
  await ensureIndexes();
  return (await getDb()).collection<WithdrawalRequest>("withdrawal_requests");
}

export async function depositRequests(): Promise<Collection<DepositRequest>> {
  await ensureIndexes();
  return (await getDb()).collection<DepositRequest>("deposit_requests");
}

export async function childGoals(): Promise<Collection<ChildGoal>> {
  await ensureIndexes();
  return (await getDb()).collection<ChildGoal>("child_goals");
}

export async function rentabilidadPagos(): Promise<Collection<RentabilidadPago>> {
  await ensureIndexes();
  return (await getDb()).collection<RentabilidadPago>("rentabilidad_pagos");
}
