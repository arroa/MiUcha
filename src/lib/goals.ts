import { ObjectId } from "mongodb";

import { getChildSession } from "@/lib/child-account";
import { childGoals, type Child, type ChildGoal, type GoalStatus } from "@/lib/collections";
import { DEFAULT_GOAL_ICON_ID, isGoalIconId } from "@/lib/goal-icons";
import { sanitizeProductUrl } from "@/lib/goal-url";
import { walletsSnapshot, type WalletView } from "@/lib/money";

const NAME_MAX = 80;
const DESC_MAX = 400;
const PRICE_MAX = 50_000_000;

export type GoalView = {
  id: string;
  name: string;
  description: string;
  targetAmountMinor: number;
  iconId: string;
  productUrl: string | null;
  status: GoalStatus;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  availableForGoals: number;
  progressPercent: number;
  missingMinor: number;
  reachable: boolean;
};

export function availableForGoalsFromWallets(wallets: WalletView[]) {
  const byType = new Map(wallets.map((row) => [row.type, row.availableMinor]));
  return (byType.get("gasto") ?? 0) + (byType.get("inversion") ?? 0);
}

export function computeGoalProgress(availableForGoals: number, targetAmountMinor: number) {
  if (!Number.isInteger(targetAmountMinor) || targetAmountMinor <= 0) {
    return { progressPercent: 0, missingMinor: 0, reachable: false };
  }
  const progressPercent = Math.min(100, Math.round((availableForGoals / targetAmountMinor) * 100));
  const missingMinor = Math.max(0, targetAmountMinor - availableForGoals);
  return {
    progressPercent,
    missingMinor,
    reachable: availableForGoals >= targetAmountMinor,
  };
}

function motivationMessage(progressPercent: number, missingMinor: number, reachable: boolean, name: string) {
  if (reachable) return `¡Ya puedes conseguir tu ${name}!`;
  if (progressPercent >= 75) return "¡Ya puedes verlo cerca!";
  if (progressPercent >= 50) return "¡Ya vas por la mitad!";
  if (missingMinor > 0) return `Te faltan $${missingMinor.toLocaleString("es-CL")}.`;
  return "Sigue sumando Tips.";
}

export function goalMotivation(goal: Pick<GoalView, "progressPercent" | "missingMinor" | "reachable" | "name">) {
  return motivationMessage(goal.progressPercent, goal.missingMinor, goal.reachable, goal.name);
}

function toView(row: ChildGoal, available: number): GoalView {
  const stats = computeGoalProgress(available, row.targetAmountMinor);
  return {
    id: row._id.toHexString(),
    name: row.name,
    description: row.description,
    targetAmountMinor: row.targetAmountMinor,
    iconId: row.iconId,
    productUrl: row.productUrl,
    status: row.status,
    isFavorite: row.isFavorite,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    availableForGoals: available,
    ...stats,
  };
}

function parseName(raw: unknown) {
  if (typeof raw !== "string") throw new Error("Escribe qué quieres conseguir.");
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Escribe qué quieres conseguir.");
  if (name.length > NAME_MAX) throw new Error(`El nombre puede tener hasta ${NAME_MAX} letras.`);
  return name;
}

function parseDescription(raw: unknown) {
  if (raw == null || raw === "") return "";
  if (typeof raw !== "string") throw new Error("La descripción no es válida.");
  const description = raw.trim();
  if (description.length > DESC_MAX) throw new Error(`La descripción puede tener hasta ${DESC_MAX} letras.`);
  return description;
}

function parsePrice(raw: unknown) {
  const amount = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("El precio tiene que ser un número de pesos mayor que cero.");
  if (amount > PRICE_MAX) throw new Error("Ese precio es demasiado alto.");
  return amount;
}

function parseIconId(raw: unknown) {
  if (raw == null || raw === "") return DEFAULT_GOAL_ICON_ID;
  if (typeof raw !== "string" || !isGoalIconId(raw)) throw new Error("Elige un ícono de la lista.");
  return raw;
}

async function requireChildGoal(child: Child, goalId: string) {
  if (!ObjectId.isValid(goalId)) throw new Error("Objetivo no encontrado.");
  const goal = await (await childGoals()).findOne({
    _id: new ObjectId(goalId),
    childId: child._id,
    familyId: child.familyId,
  });
  if (!goal) throw new Error("Objetivo no encontrado.");
  return goal;
}

export async function listGoalsForChild(child: Child, status?: GoalStatus | "all") {
  const available = availableForGoalsFromWallets(await walletsSnapshot(child.familyId, child._id));
  const filter: Record<string, unknown> = { childId: child._id, familyId: child.familyId };
  if (status && status !== "all") filter.status = status;
  const rows = await (await childGoals())
    .find(filter)
    .sort({ isFavorite: -1, updatedAt: -1 })
    .toArray();
  return { availableForGoals: available, goals: rows.map((row) => toView(row, available)) };
}

export async function getFavoriteGoalForChild(child: Child): Promise<GoalView | null> {
  const available = availableForGoalsFromWallets(await walletsSnapshot(child.familyId, child._id));
  const row = await (await childGoals()).findOne({
    childId: child._id,
    familyId: child.familyId,
    status: "active",
    isFavorite: true,
  });
  return row ? toView(row, available) : null;
}

export async function getGoalForChild(child: Child, goalId: string) {
  const [goal, wallets] = await Promise.all([
    requireChildGoal(child, goalId),
    walletsSnapshot(child.familyId, child._id),
  ]);
  return toView(goal, availableForGoalsFromWallets(wallets));
}

export async function createGoalForChild(child: Child, raw: unknown) {
  const json = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const now = new Date();
  const col = await childGoals();
  const activeCount = await col.countDocuments({ childId: child._id, familyId: child.familyId, status: "active" });
  const doc: ChildGoal = {
    _id: new ObjectId(),
    familyId: child.familyId,
    childId: child._id,
    name: parseName(json.name),
    description: parseDescription(json.description),
    targetAmountMinor: parsePrice(json.targetAmountMinor),
    iconId: parseIconId(json.iconId),
    productUrl: sanitizeProductUrl(json.productUrl),
    status: "active",
    isFavorite: activeCount === 0,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  await col.insertOne(doc);
  const available = availableForGoalsFromWallets(await walletsSnapshot(child.familyId, child._id));
  return toView(doc, available);
}

export async function updateGoalForChild(child: Child, goalId: string, raw: unknown) {
  const goal = await requireChildGoal(child, goalId);
  if (goal.status !== "active") throw new Error("Solo puedes editar objetivos activos.");
  const json = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const patch: Partial<ChildGoal> = { updatedAt: new Date() };
  if ("name" in json) patch.name = parseName(json.name);
  if ("description" in json) patch.description = parseDescription(json.description);
  if ("targetAmountMinor" in json) patch.targetAmountMinor = parsePrice(json.targetAmountMinor);
  if ("iconId" in json) patch.iconId = parseIconId(json.iconId);
  if ("productUrl" in json) patch.productUrl = sanitizeProductUrl(json.productUrl);

  await (await childGoals()).updateOne({ _id: goal._id, childId: child._id }, { $set: patch });
  return getGoalForChild(child, goalId);
}

export async function setFavoriteGoalForChild(child: Child, goalId: string) {
  const goal = await requireChildGoal(child, goalId);
  if (goal.status !== "active") throw new Error("Solo un objetivo activo puede ser favorito.");
  const col = await childGoals();
  await col.updateMany(
    { childId: child._id, familyId: child.familyId, isFavorite: true },
    { $set: { isFavorite: false, updatedAt: new Date() } },
  );
  await col.updateOne(
    { _id: goal._id, childId: child._id, status: "active" },
    { $set: { isFavorite: true, updatedAt: new Date() } },
  );
  return getGoalForChild(child, goalId);
}

export async function achieveGoalForChild(child: Child, goalId: string) {
  const goal = await requireChildGoal(child, goalId);
  if (goal.status !== "active") throw new Error("Ese objetivo ya no está activo.");
  const now = new Date();
  await (await childGoals()).updateOne(
    { _id: goal._id, childId: child._id },
    { $set: { status: "achieved", isFavorite: false, completedAt: now, updatedAt: now } },
  );
  return getGoalForChild(child, goalId);
}

export async function discardGoalForChild(child: Child, goalId: string) {
  const goal = await requireChildGoal(child, goalId);
  if (goal.status !== "active") throw new Error("Ese objetivo ya no está activo.");
  const now = new Date();
  await (await childGoals()).updateOne(
    { _id: goal._id, childId: child._id },
    { $set: { status: "discarded", isFavorite: false, updatedAt: now } },
  );
  return getGoalForChild(child, goalId);
}

export async function goalsForCurrentChild(status?: GoalStatus | "all") {
  const child = await getChildSession();
  if (!child) return null;
  return listGoalsForChild(child, status);
}
