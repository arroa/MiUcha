import { ObjectId } from "mongodb";

import { children, tipDefinitions, type TipFrequency } from "@/lib/collections";
import { TIP_CATALOG } from "@/lib/tip-catalog";

export type TipView = {
  id: string;
  catalogKey: string | null;
  title: string;
  amountMinor: number;
  frequency: TipFrequency;
  daysOfWeek: number[];
  assignedChildIds: string[];
  active: boolean;
  hidden: boolean;
  startsOn: string | null;
};

const FREQUENCIES: TipFrequency[] = ["once", "daily", "weekly"];

export async function listFamilyTips(familyId: string): Promise<TipView[]> {
  const rows = await (await tipDefinitions()).find({ familyId: new ObjectId(familyId) }).sort({ createdAt: -1 }).toArray();
  return rows.map(toView);
}

export async function createFamilyTip(familyId: string, input: unknown): Promise<TipView> {
  const parsed = await parseTip(familyId, input);
  const now = new Date();
  const _id = new ObjectId();
  await (await tipDefinitions()).insertOne({
    _id,
    familyId: new ObjectId(familyId),
    ...parsed,
    createdAt: now,
  });
  return toView({ _id, ...parsed });
}

export async function updateFamilyTip(familyId: string, tipId: string, input: unknown): Promise<TipView> {
  if (!ObjectId.isValid(tipId)) throw new Error("Tip no encontrado.");
  const col = await tipDefinitions();
  const current = await col.findOne({ _id: new ObjectId(tipId), familyId: new ObjectId(familyId) });
  if (!current) throw new Error("Tip no encontrado.");

  const parsed = await parseTip(familyId, {
    title: current.title,
    amountMinor: current.amountMinor,
    frequency: current.frequency,
    daysOfWeek: current.daysOfWeek,
    assignedChildIds: current.assignedChildIds.map((id) => id.toHexString()),
    active: current.active,
    startsOn: current.startsOn,
    ...(input && typeof input === "object" ? input : {}),
  });

  await col.updateOne({ _id: current._id }, { $set: parsed, $unset: { description: "" } });
  return toView({ _id: current._id, ...parsed });
}

export async function saveFamilyCatalog(
  familyId: string,
  input: unknown,
): Promise<TipView[]> {
  const items = (input as { items?: { key?: string; title?: string; amountMinor?: number; active?: boolean }[] } | null)?.items;
  if (!Array.isArray(items)) throw new Error("Falta la lista de tareas.");

  const byKey = new Map(items.map((item) => [item.key ?? "", item]));
  const familyObjectId = new ObjectId(familyId);
  const childIds = await activeChildIds(familyObjectId);
  const col = await tipDefinitions();
  const existing = await col.find({ familyId: familyObjectId, catalogKey: { $exists: true } }).toArray();
  const existingByKey = new Map(existing.map((tip) => [tip.catalogKey ?? "", tip]));
  const catalogKeys = new Set<string>(TIP_CATALOG.map((task) => task.key));

  for (const task of TIP_CATALOG) {
    const item = byKey.get(task.key);
    const current = existingByKey.get(task.key);
    if (!item || current?.hidden) continue;
    const title = item.title?.trim() || task.title;
    if (title.length > 80) throw new Error("El nombre de la tarea es demasiado largo.");
    const active = Boolean(item.active);
    const amountMinor = Number(item.amountMinor);
    if (!Number.isInteger(amountMinor) || amountMinor <= 0) throw new Error(`Ponle un precio en pesos a ${title}.`);
    const fields = taskFields(task.key, title, amountMinor, childIds, active);
    if (current) await col.updateOne({ _id: current._id }, { $set: fields, $unset: { description: "" } });
    else await col.insertOne({ _id: new ObjectId(), familyId: familyObjectId, ...fields, createdAt: new Date() });
  }

  for (const item of items) {
    const key = item.key ?? "";
    if (!key || catalogKeys.has(key) || key.startsWith("new-")) continue;
    const current = existingByKey.get(key);
    if (!current || current.hidden) continue;
    const title = item.title?.trim() ?? "";
    if (!title || title.length > 80) throw new Error("La tarea necesita un nombre de hasta 80 caracteres.");
    const amountMinor = Number(item.amountMinor);
    if (!Number.isInteger(amountMinor) || amountMinor <= 0) throw new Error(`Ponle un precio en pesos a ${title}.`);
    await col.updateOne({ _id: current._id }, { $set: taskFields(key, title, amountMinor, childIds, Boolean(item.active)), $unset: { description: "" } });
  }

  for (const item of items.filter((entry) => (entry.key ?? "").startsWith("new-"))) {
    const title = item.title?.trim() ?? "";
    if (!title || title.length > 80) throw new Error("La tarea necesita un nombre de hasta 80 caracteres.");
    const amountMinor = Number(item.amountMinor);
    if (!Number.isInteger(amountMinor) || amountMinor <= 0) throw new Error(`Ponle un precio en pesos a ${title}.`);
    const _id = new ObjectId();
    await col.insertOne({
      _id,
      familyId: familyObjectId,
      ...taskFields(`custom-${_id.toHexString()}`, title, amountMinor, childIds, item.active !== false),
      createdAt: new Date(),
    });
  }

  return listFamilyTips(familyId);
}

export async function createCustomFamilyTip(familyId: string, input: unknown): Promise<TipView> {
  const json = (input ?? {}) as { title?: string; amountMinor?: number };
  const title = json.title?.trim() ?? "";
  if (!title || title.length > 80) throw new Error("La tarea necesita un nombre de hasta 80 caracteres.");
  const amountMinor = Number(json.amountMinor);
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("El valor del Tip es un número de pesos mayor que cero.");
  }
  const familyObjectId = new ObjectId(familyId);
  const _id = new ObjectId();
  const doc = {
    _id,
    familyId: familyObjectId,
    ...taskFields(`custom-${_id.toHexString()}`, title, amountMinor, await activeChildIds(familyObjectId), true),
    createdAt: new Date(),
  };
  await (await tipDefinitions()).insertOne(doc);
  return toView(doc);
}

export async function dismissFamilyTask(familyId: string, key: string) {
  const familyObjectId = new ObjectId(familyId);
  const col = await tipDefinitions();
  if (key.startsWith("custom-")) {
    const result = await col.deleteOne({ familyId: familyObjectId, catalogKey: key });
    if (!result.deletedCount) throw new Error("Tarea no encontrada.");
    return;
  }
  const task = TIP_CATALOG.find((item) => item.key === key);
  if (!task) throw new Error("Tarea no encontrada.");
  await col.updateOne(
    { familyId: familyObjectId, catalogKey: key },
    {
      $set: { ...taskFields(key, task.title, task.suggestedMinor, await activeChildIds(familyObjectId), false), hidden: true },
      $unset: { description: "" },
      $setOnInsert: { _id: new ObjectId(), createdAt: new Date() },
    },
    { upsert: true },
  );
}

function taskFields(catalogKey: string, title: string, amountMinor: number, childIds: ObjectId[], active: boolean) {
  return {
    catalogKey,
    title,
    amountMinor,
    frequency: "daily" as const,
    daysOfWeek: [] as number[],
    assignedChildIds: childIds,
    active,
    hidden: false,
    startsOn: null,
  };
}

async function activeChildIds(familyId: ObjectId) {
  return (await (await children()).find({ familyId, active: true }).toArray()).map((child) => child._id);
}

export async function assignChildToActiveTips(familyId: ObjectId, childId: ObjectId) {
  await (await tipDefinitions()).updateMany({ familyId, active: true }, { $addToSet: { assignedChildIds: childId } });
}

async function parseTip(familyId: string, input: unknown) {
  const json = (input ?? {}) as {
    title?: string;
    amountMinor?: number;
    frequency?: string;
    daysOfWeek?: number[];
    assignedChildIds?: string[];
    active?: boolean;
    startsOn?: string | null;
  };

  const title = json.title?.trim() ?? "";
  if (!title || title.length > 80) throw new Error("El Tip necesita un nombre de hasta 80 caracteres.");

  const amountMinor = Number(json.amountMinor);
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("El valor del Tip es un número de pesos mayor que cero.");
  }

  const frequency = json.frequency;
  if (!frequency || !FREQUENCIES.includes(frequency as TipFrequency)) {
    throw new Error("La frecuencia es una vez, todos los días o algunos días.");
  }

  const daysOfWeek = frequency === "weekly" ? uniqueDays(json.daysOfWeek ?? []) : [];
  if (frequency === "weekly" && daysOfWeek.length === 0) {
    throw new Error("Elige al menos un día de la semana.");
  }

  const assignedChildIds = await childrenOfFamily(familyId, json.assignedChildIds ?? []);
  if (assignedChildIds.length === 0) throw new Error("Elige al menos un niño de la familia.");

  const startsOn = json.startsOn?.trim() || null;
  if (startsOn && !/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) throw new Error("La fecha de inicio no es válida.");

  return {
    title,
    amountMinor,
    frequency: frequency as TipFrequency,
    daysOfWeek,
    assignedChildIds,
    active: json.active !== false,
    startsOn,
  };
}

function uniqueDays(days: number[]) {
  return [...new Set(days.map(Number))].filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
}

async function childrenOfFamily(familyId: string, ids: string[]) {
  const unique = [...new Set(ids.filter((id) => ObjectId.isValid(id)))];
  if (unique.length === 0) return [];
  const rows = await (await children())
    .find({
      familyId: new ObjectId(familyId),
      active: true,
      _id: { $in: unique.map((id) => new ObjectId(id)) },
    })
    .toArray();
  if (rows.length !== unique.length) throw new Error("Elige niños de esta familia.");
  return rows.map((child) => child._id);
}

function toView(tip: {
  _id: ObjectId;
  catalogKey?: string;
  title: string;
  amountMinor: number;
  frequency: TipFrequency;
  daysOfWeek: number[];
  assignedChildIds: ObjectId[];
  active: boolean;
  hidden?: boolean;
  startsOn: string | null;
}): TipView {
  return {
    id: tip._id.toHexString(),
    catalogKey: tip.catalogKey ?? null,
    title: tip.title,
    amountMinor: tip.amountMinor,
    frequency: tip.frequency,
    daysOfWeek: tip.daysOfWeek,
    assignedChildIds: tip.assignedChildIds.map((id) => id.toHexString()),
    active: tip.active,
    hidden: Boolean(tip.hidden),
    startsOn: tip.startsOn,
  };
}
