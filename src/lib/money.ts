import { MongoServerError, ObjectId, type ClientSession } from "mongodb";

import { getChildSession } from "@/lib/child-account";
import {
  children,
  ledgerEntries,
  wallets,
  withdrawalRequests,
  type Child,
  type WalletType,
  type WithdrawalRequest,
  type WithdrawalStatus,
} from "@/lib/collections";
import { requireBanquero, requireFamilyAdult } from "@/lib/family-admin";
import { getMongoClient } from "@/lib/mongodb";

import { WALLET_LABELS, WALLET_TYPES } from "@/lib/wallet-labels";

export type { WalletType, WithdrawalStatus };
export { WALLET_LABELS, WALLET_TYPES };

export type WalletView = {
  type: WalletType;
  balanceMinor: number;
  reservedMinor: number;
  availableMinor: number;
};

export type WithdrawalView = {
  id: string;
  childId: string;
  childName: string;
  walletType: WalletType;
  amountMinor: number;
  note: string;
  status: WithdrawalStatus;
  createdAt: string;
  completedAt: string | null;
};

function isWalletType(value: unknown): value is WalletType {
  return value === "inversion" || value === "gasto" || value === "donaciones";
}

function parseAmount(raw: unknown) {
  const amount = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("El monto es un número de pesos mayor que cero.");
  return amount;
}

export async function inMoneySession(work: (session?: ClientSession) => Promise<void>) {
  const client = await getMongoClient();
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      await work(session);
    });
  } catch (error) {
    if (!isStandalone(error)) throw error;
    await work(undefined);
  } finally {
    await session.endSession();
  }
}

function isStandalone(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (error instanceof MongoServerError && (error.code === 20 || error.codeName === "IllegalOperation")) return true;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  if (
    message.includes("replica set") ||
    message.includes("Transaction numbers") ||
    message.includes("retryable writes") ||
    message.includes("retryWrites")
  ) {
    return true;
  }
  return "cause" in error ? isStandalone(error.cause) : false;
}

async function reservedByWallet(familyId: ObjectId, childId: ObjectId, session?: ClientSession) {
  const rows = await (await withdrawalRequests())
    .find({ familyId, childId, status: "pending" }, session ? { session } : {})
    .project({ walletType: 1, amountMinor: 1 })
    .toArray();
  const reserved = new Map<WalletType, number>();
  for (const row of rows) {
    reserved.set(row.walletType, (reserved.get(row.walletType) ?? 0) + row.amountMinor);
  }
  return reserved;
}

export async function walletsSnapshot(familyId: ObjectId, childId: ObjectId, session?: ClientSession): Promise<WalletView[]> {
  const [walletRows, reserved] = await Promise.all([
    (await wallets()).find({ familyId, childId }, session ? { session } : {}).toArray(),
    reservedByWallet(familyId, childId, session),
  ]);
  const byType = new Map(walletRows.map((row) => [row.type, row.balanceMinor]));
  return WALLET_TYPES.map((type) => {
    const balanceMinor = byType.get(type) ?? 0;
    const reservedMinor = reserved.get(type) ?? 0;
    return {
      type,
      balanceMinor,
      reservedMinor,
      availableMinor: Math.max(0, balanceMinor - reservedMinor),
    };
  });
}

export async function walletsForCurrentChild(): Promise<WalletView[] | null> {
  const child = await getChildSession();
  if (!child) return null;
  return walletsSnapshot(child.familyId, child._id);
}

export async function walletsForAdultChild(childId: string): Promise<WalletView[]> {
  const adult = await requireFamilyAdult();
  if (!adult?.familyId) throw new Error("No autorizado.");
  if (!ObjectId.isValid(childId)) throw new Error("Niño no encontrado.");
  const familyId = new ObjectId(adult.familyId);
  const childObjectId = new ObjectId(childId);
  const child = await (await children()).findOne({ _id: childObjectId, familyId, active: true });
  if (!child) throw new Error("Niño no encontrado.");
  return walletsSnapshot(familyId, childObjectId);
}

function toWithdrawalView(row: WithdrawalRequest, childName: string): WithdrawalView {
  return {
    id: row._id.toHexString(),
    childId: row.childId.toHexString(),
    childName,
    walletType: row.walletType,
    amountMinor: row.amountMinor,
    note: row.note,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

async function withChildNames(rows: WithdrawalRequest[]): Promise<WithdrawalView[]> {
  const ids = rows.map((row) => row.childId);
  const kids = ids.length ? await (await children()).find({ _id: { $in: ids } }).toArray() : [];
  const names = new Map(kids.map((child) => [child._id.toHexString(), child.name]));
  return rows.map((row) => toWithdrawalView(row, names.get(row.childId.toHexString()) ?? ""));
}

export async function listPendingWithdrawals(familyId: string): Promise<WithdrawalView[]> {
  const rows = await (await withdrawalRequests())
    .find({ familyId: new ObjectId(familyId), status: "pending" })
    .sort({ createdAt: 1 })
    .toArray();
  return withChildNames(rows);
}

export async function listRecentWithdrawals(familyId: string): Promise<WithdrawalView[]> {
  const rows = await (await withdrawalRequests())
    .find({ familyId: new ObjectId(familyId), status: { $in: ["completed", "cancelled"] } })
    .sort({ createdAt: -1 })
    .limit(40)
    .toArray();
  return withChildNames(rows);
}

export async function listChildWithdrawals(child: Child): Promise<WithdrawalView[]> {
  const rows = await (await withdrawalRequests())
    .find({ childId: child._id, status: { $in: ["pending", "completed", "cancelled"] } })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
  return rows.map((row) => toWithdrawalView(row, child.name));
}

export async function requestWithdrawal(child: Child, input: unknown): Promise<WithdrawalView> {
  const json = (input ?? {}) as { walletType?: unknown; amountMinor?: unknown; note?: unknown };
  if (!isWalletType(json.walletType)) throw new Error("Elige desde qué Ucha retirar.");
  const amountMinor = parseAmount(json.amountMinor);
  const note = typeof json.note === "string" ? json.note.trim() : "";
  if (note.length > 160) throw new Error("La nota es demasiado larga.");

  const snap = await walletsSnapshot(child.familyId, child._id);
  const wallet = snap.find((row) => row.type === json.walletType);
  if (!wallet || wallet.availableMinor < amountMinor) {
    throw new Error(`No hay suficiente disponible en ${WALLET_LABELS[json.walletType]}.`);
  }

  const now = new Date();
  const doc: WithdrawalRequest = {
    _id: new ObjectId(),
    familyId: child.familyId,
    childId: child._id,
    walletType: json.walletType,
    amountMinor,
    note,
    status: "pending",
    createdAt: now,
    completedAt: null,
    banqueroId: null,
  };
  await (await withdrawalRequests()).insertOne(doc);
  return toWithdrawalView(doc, child.name);
}

export async function cancelWithdrawal(requestId: string, actor: { familyId: ObjectId; childId?: ObjectId; adultId?: string }) {
  if (!ObjectId.isValid(requestId)) throw new Error("Pedido no encontrado.");
  const filter: Record<string, unknown> = {
    _id: new ObjectId(requestId),
    familyId: actor.familyId,
    status: "pending",
  };
  if (actor.childId) filter.childId = actor.childId;

  const result = await (await withdrawalRequests()).updateOne(filter, {
    $set: { status: "cancelled", completedAt: new Date() },
  });
  if (!result.matchedCount) throw new Error("Ese pedido ya no se puede cancelar.");
}

export async function completeWithdrawal(familyId: string, banqueroId: string, requestId: string) {
  if (!ObjectId.isValid(requestId) || !ObjectId.isValid(banqueroId)) throw new Error("Pedido no encontrado.");
  await inMoneySession(async (session) => {
    const options = session ? { session } : {};
    const col = await withdrawalRequests();
    const request = await col.findOne(
      { _id: new ObjectId(requestId), familyId: new ObjectId(familyId), status: "pending" },
      options,
    );
    if (!request) throw new Error("Ese pedido ya no está pendiente.");

    const wallet = await (await wallets()).findOne(
      { familyId: request.familyId, childId: request.childId, type: request.walletType },
      options,
    );
    if (!wallet || wallet.balanceMinor < request.amountMinor) {
      throw new Error("El saldo ya no alcanza para entregar ese pedido.");
    }

    const now = new Date();
    const flipped = await col.updateOne(
      { _id: request._id, status: "pending" },
      { $set: { status: "completed", completedAt: now, banqueroId: new ObjectId(banqueroId) } },
      options,
    );
    if (!flipped.modifiedCount) throw new Error("Ese pedido ya no está pendiente.");

    const operationId = `withdrawal:${request._id.toHexString()}`;
    await (await ledgerEntries()).insertOne(
      {
        _id: new ObjectId(),
        familyId: request.familyId,
        childId: request.childId,
        walletType: request.walletType,
        amountMinor: -request.amountMinor,
        kind: "withdrawal",
        operationId,
        actorId: banqueroId,
        createdAt: now,
      },
      options,
    );
    const debited = await (await wallets()).updateOne(
      {
        familyId: request.familyId,
        childId: request.childId,
        type: request.walletType,
        balanceMinor: { $gte: request.amountMinor },
      },
      { $inc: { balanceMinor: -request.amountMinor }, $set: { updatedAt: now } },
      options,
    );
    if (!debited.modifiedCount) throw new Error("El saldo ya no alcanza para entregar ese pedido.");
  });
}

export async function transferGastoToInversion(child: Child, input: unknown) {
  const json = (input ?? {}) as { amountMinor?: unknown };
  const amountMinor = parseAmount(json.amountMinor);

  await inMoneySession(async (session) => {
    const snap = await walletsSnapshot(child.familyId, child._id, session);
    const gasto = snap.find((row) => row.type === "gasto");
    if (!gasto || gasto.availableMinor < amountMinor) {
      throw new Error("No hay suficiente disponible en Gasto.");
    }

    const now = new Date();
    const operationId = `transfer:${new ObjectId().toHexString()}`;
    const options = session ? { session } : {};
    const actorId = child._id.toHexString();

    const debited = await (await wallets()).updateOne(
      {
        familyId: child.familyId,
        childId: child._id,
        type: "gasto",
        balanceMinor: { $gte: amountMinor },
      },
      { $inc: { balanceMinor: -amountMinor }, $set: { updatedAt: now } },
      options,
    );
    if (!debited.modifiedCount) throw new Error("No hay suficiente disponible en Gasto.");

    const credited = await (await wallets()).updateOne(
      { familyId: child.familyId, childId: child._id, type: "inversion" },
      { $inc: { balanceMinor: amountMinor }, $set: { updatedAt: now } },
      options,
    );
    if (!credited.matchedCount) throw new Error("Falta la Ucha de Inversión.");

    await (await ledgerEntries()).insertMany(
      [
        {
          _id: new ObjectId(),
          familyId: child.familyId,
          childId: child._id,
          walletType: "gasto",
          amountMinor: -amountMinor,
          kind: "transfer",
          operationId,
          actorId,
          createdAt: now,
        },
        {
          _id: new ObjectId(),
          familyId: child.familyId,
          childId: child._id,
          walletType: "inversion",
          amountMinor,
          kind: "transfer",
          operationId,
          actorId,
          createdAt: now,
        },
      ],
      options,
    );
  });
}

export async function pendingWithdrawalsForAdult() {
  const adult = await requireFamilyAdult();
  if (!adult?.familyId) return null;
  return { familyId: adult.familyId, role: adult.role, withdrawals: await listPendingWithdrawals(adult.familyId) };
}

export async function historyWithdrawalsForAdult() {
  const adult = await requireFamilyAdult();
  if (!adult?.familyId) return null;
  return { withdrawals: await listRecentWithdrawals(adult.familyId) };
}

export async function completeWithdrawalForBanquero(requestId: string) {
  const adult = await requireBanquero();
  if (!adult?.familyId || !adult.adultId) throw new Error("No autorizado.");
  await completeWithdrawal(adult.familyId, adult.adultId, requestId);
}

export async function creditRentabilidad(familyId: string, banqueroId: string, childId: string, input: unknown) {
  if (!ObjectId.isValid(childId) || !ObjectId.isValid(banqueroId)) throw new Error("Niño no encontrado.");
  const json = (input ?? {}) as { amountMinor?: unknown; note?: unknown };
  const amountMinor = parseAmount(json.amountMinor);
  const note = typeof json.note === "string" ? json.note.trim() : "";
  if (note.length > 160) throw new Error("La nota es demasiado larga.");

  const familyObjectId = new ObjectId(familyId);
  const childObjectId = new ObjectId(childId);
  const child = await (await children()).findOne({ _id: childObjectId, familyId: familyObjectId, active: true });
  if (!child) throw new Error("Niño no encontrado.");

  await inMoneySession(async (session) => {
    const options = session ? { session } : {};
    const now = new Date();
    const operationId = `interest:${new ObjectId().toHexString()}`;
    const credited = await (await wallets()).updateOne(
      { familyId: familyObjectId, childId: childObjectId, type: "inversion" },
      { $inc: { balanceMinor: amountMinor }, $set: { updatedAt: now } },
      options,
    );
    if (!credited.matchedCount) throw new Error("Falta la Ucha de Inversión.");
    await (await ledgerEntries()).insertOne(
      {
        _id: new ObjectId(),
        familyId: familyObjectId,
        childId: childObjectId,
        walletType: "inversion",
        amountMinor,
        kind: "interest",
        operationId,
        actorId: banqueroId,
        createdAt: now,
      },
      options,
    );
  });

  return {
    childId: child._id.toHexString(),
    childName: child.name,
    amountMinor,
    note,
    walletType: "inversion" as const,
  };
}

export async function creditRentabilidadForBanquero(childId: string, input: unknown) {
  const adult = await requireBanquero();
  if (!adult?.familyId || !adult.adultId) throw new Error("No autorizado.");
  return creditRentabilidad(adult.familyId, adult.adultId, childId, input);
}

export async function cancelWithdrawalForActor(requestId: string) {
  const child = await getChildSession();
  if (child) {
    await cancelWithdrawal(requestId, { familyId: child.familyId, childId: child._id });
    return;
  }
  const adult = await requireBanquero();
  if (!adult?.familyId) throw new Error("No autorizado.");
  await cancelWithdrawal(requestId, { familyId: new ObjectId(adult.familyId), adultId: adult.adultId ?? undefined });
}
