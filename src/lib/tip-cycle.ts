import { MongoServerError, ObjectId, type ClientSession } from "mongodb";

import { getChildSession } from "@/lib/child-account";
import {
  adults,
  children,
  families,
  ledgerEntries,
  tipDefinitions,
  tipOccurrences,
  wallets,
  type Child,
  type TipOccurrence,
  type TipOccurrenceStatus,
} from "@/lib/collections";
import { requireFamilyAdult } from "@/lib/family-admin";
import { inMoneySession } from "@/lib/money";
import { addDays, santiagoToday, weekdayOf } from "@/lib/santiago-date";

export type TaskView = {
  id: string;
  definitionId: string;
  title: string;
  amountMinor: number;
  status: TipOccurrenceStatus;
  reviewNote: string;
  childName: string;
  occurrenceDate: string;
  read: boolean;
};

export type TipWhen = "hoy" | "ayer";

export function splitTip(amount: number, pctInversion: number, pctDonaciones: number) {
  const inversion = Math.floor((amount * pctInversion) / 100);
  const donaciones = Math.floor((amount * pctDonaciones) / 100);
  const gasto = amount - inversion - donaciones;
  if (gasto < 0) throw new Error("Los porcentajes de la familia no cierran en 100.");
  return [
    ["inversion", inversion],
    ["gasto", gasto],
    ["donaciones", donaciones],
  ] as const;
}

export async function ensureTasksForDate(child: Child, date: string): Promise<TaskView[]> {
  const today = santiagoToday().date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) return [];
  const weekday = weekdayOf(date);
  const definitions = await (await tipDefinitions())
    .find({ familyId: child.familyId, active: true, hidden: { $ne: true }, assignedChildIds: child._id })
    .toArray();
  const occurrences = await tipOccurrences();

  for (const definition of definitions) {
    if (definition.startsOn && definition.startsOn > date) continue;
    if (definition.frequency === "weekly" && !definition.daysOfWeek.includes(weekday)) continue;
    if (definition.frequency === "once") {
      const previous = await occurrences.findOne({ familyId: child.familyId, childId: child._id, definitionId: definition._id });
      if (previous && previous.occurrenceDate !== date) continue;
    }
    try {
      await occurrences.updateOne(
        { familyId: child.familyId, childId: child._id, definitionId: definition._id, occurrenceDate: date },
        {
          $setOnInsert: {
            _id: new ObjectId(),
            title: definition.title,
            amountMinor: definition.amountMinor,
            status: "available",
            submittedAt: null,
            reviewedAt: null,
            reviewerId: null,
            reviewNote: "",
          },
        },
        { upsert: true },
      );
    } catch (error) {
      if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
    }
  }

  const rows = await occurrences.find({ childId: child._id, occurrenceDate: date }).sort({ title: 1 }).toArray();
  return rows.map((row) => toView(row, child.name));
}

export async function ensureTodayTasks(child: Child) {
  return ensureTasksForDate(child, santiagoToday().date);
}

export async function ensureAllTodayTasks() {
  const kids = await (await children()).find({ active: true }).toArray();
  for (const child of kids) await ensureTodayTasks(child);
}

export async function listChildNews(child: Child): Promise<TaskView[]> {
  const rows = await (await tipOccurrences())
    .find({
      childId: child._id,
      status: { $in: ["approved", "rejected", "needs_improvement"] },
      newsDismissedAt: null,
    })
    .sort({ reviewedAt: -1 })
    .limit(12)
    .toArray();
  return rows.map((row) => toView(row, child.name));
}

export async function confirmDay(child: Child, date: string, ids: string[]) {
  const today = santiagoToday().date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) throw new Error("Ese día no se puede confirmar.");
  const unique = [...new Set(ids)].filter((id) => ObjectId.isValid(id));
  if (unique.length === 0) throw new Error("Marca las tareas que hiciste.");
  const result = await (await tipOccurrences()).updateMany(
    {
      _id: { $in: unique.map((id) => new ObjectId(id)) },
      childId: child._id,
      occurrenceDate: date,
      status: { $in: ["available", "needs_improvement"] },
    },
    { $set: { status: "submitted", submittedAt: new Date(), reviewNote: "" } },
  );
  if (!result.matchedCount) throw new Error("Esas tareas ya no se pueden confirmar.");
}

/** Confirma un Tip indicando si fue hoy o ayer (sin calendario). */
export async function confirmTipWhen(child: Child, occurrenceId: string, when: TipWhen) {
  if (!ObjectId.isValid(occurrenceId)) throw new Error("Tip no encontrado.");
  if (when !== "hoy" && when !== "ayer") throw new Error("Elige si lo hiciste hoy o ayer.");

  const today = santiagoToday().date;
  const date = when === "hoy" ? today : addDays(today, -1);
  const col = await tipOccurrences();
  const source = await col.findOne({ _id: new ObjectId(occurrenceId), childId: child._id });
  if (!source) throw new Error("Tip no encontrado.");

  if (when === "hoy") {
    if (source.occurrenceDate !== today) throw new Error("Ese Tip no es de hoy.");
    await confirmDay(child, today, [occurrenceId]);
    return { date, when, title: source.title };
  }

  await ensureTasksForDate(child, date);
  const yesterday = await col.findOne({
    childId: child._id,
    definitionId: source.definitionId,
    occurrenceDate: date,
  });
  if (!yesterday) throw new Error("Ese Tip no tocaba ayer.");
  if (yesterday.status !== "available" && yesterday.status !== "needs_improvement") {
    throw new Error("Ese Tip de ayer ya está en revisión o listo.");
  }
  await confirmDay(child, date, [yesterday._id.toHexString()]);
  return { date, when, title: source.title };
}

export async function listReviewerNames(familyId: ObjectId) {
  const people = await (await adults())
    .find({ familyId, active: true, role: { $in: ["banquero", "auditor"] } })
    .project({ name: 1 })
    .toArray();
  return people.map((person) => person.name.trim()).filter(Boolean);
}

export function formatReviewerPhrase(names: string[]) {
  if (names.length === 0) return "Un adulto de tu familia";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} o ${names[1]}`;
  const last = names[names.length - 1];
  return `${names.slice(0, -1).join(", ")} o ${last}`;
}

async function withChildNames(rows: TipOccurrence[]): Promise<TaskView[]> {
  const ids = rows.map((row) => row.childId);
  const kids = ids.length ? await (await children()).find({ _id: { $in: ids } }).toArray() : [];
  const names = new Map(kids.map((child) => [child._id.toHexString(), child.name]));
  return rows.map((row) => toView(row, names.get(row.childId.toHexString()) ?? ""));
}

export async function listPendingTasks(familyId: string): Promise<TaskView[]> {
  const rows = await (await tipOccurrences())
    .find({ familyId: new ObjectId(familyId), status: "submitted" })
    .sort({ occurrenceDate: -1, submittedAt: 1 })
    .toArray();
  return withChildNames(rows);
}

export async function listReviewedTasks(familyId: string): Promise<TaskView[]> {
  const rows = await (await tipOccurrences())
    .find({ familyId: new ObjectId(familyId), status: { $in: ["approved", "needs_improvement", "rejected"] } })
    .sort({ occurrenceDate: -1, reviewedAt: -1 })
    .limit(60)
    .toArray();
  return withChildNames(rows);
}

export async function submitTask(child: Child, taskId: string) {
  if (!ObjectId.isValid(taskId)) throw new Error("Tarea no encontrada.");
  const result = await (await tipOccurrences()).updateOne(
    { _id: new ObjectId(taskId), childId: child._id, status: { $in: ["available", "needs_improvement"] } },
    { $set: { status: "submitted", submittedAt: new Date(), reviewNote: "" } },
  );
  if (!result.matchedCount) throw new Error("Esta tarea ya no se puede marcar.");
}

export async function reviewTask(
  familyId: string,
  adultId: string,
  taskId: string,
  decision: "approved" | "needs_improvement" | "rejected",
  note: string,
) {
  if (!ObjectId.isValid(taskId) || !ObjectId.isValid(adultId)) throw new Error("Tarea no encontrada.");
  const occurrences = await tipOccurrences();
  const occurrence = await occurrences.findOne({ _id: new ObjectId(taskId), familyId: new ObjectId(familyId) });
  if (!occurrence) throw new Error("Tarea no encontrada.");
  if (occurrence.status !== "submitted") throw new Error("Esta tarea ya no está por revisar.");

  if (decision === "needs_improvement" || decision === "rejected") {
    const reviewNote = note.trim();
    if (decision === "needs_improvement" && !reviewNote) throw new Error("Cuéntale qué puede mejorar.");
    if (reviewNote.length > 200) throw new Error("La nota es demasiado larga.");
    const status = decision === "rejected" ? "rejected" : "needs_improvement";
    const result = await occurrences.updateOne(
      { _id: occurrence._id, status: "submitted" },
      {
        $set: { status, reviewNote, reviewedAt: new Date(), reviewerId: new ObjectId(adultId) },
        $unset: { newsReadAt: "", newsDismissedAt: "" },
      },
    );
    if (!result.modifiedCount) throw new Error("Esta tarea ya no está por revisar.");
    return;
  }

  await inMoneySession((session) => payTip(occurrence, adultId, session));
}

async function payTip(occurrence: TipOccurrence, adultId: string, session?: ClientSession) {
  const family = await (await families()).findOne({ _id: occurrence.familyId }, session ? { session } : {});
  if (!family) throw new Error("No encontramos la familia.");
  const parts = splitTip(occurrence.amountMinor, family.pctInversion, family.pctDonaciones);
  const now = new Date();
  const options = session ? { session } : {};
  const flipped = await (await tipOccurrences()).updateOne(
    { _id: occurrence._id, status: "submitted" },
    {
      $set: { status: "approved", reviewedAt: now, reviewerId: new ObjectId(adultId), reviewNote: "" },
      $unset: { newsReadAt: "", newsDismissedAt: "" },
    },
    options,
  );
  if (!flipped.modifiedCount) throw new Error("Esta tarea ya no está por revisar.");

  const operationId = `tipApproval:${occurrence._id.toHexString()}`;
  for (const [walletType, amountMinor] of parts) {
    if (amountMinor <= 0) continue;
    await (await ledgerEntries()).insertOne(
      {
        _id: new ObjectId(),
        familyId: occurrence.familyId,
        childId: occurrence.childId,
        walletType,
        amountMinor,
        kind: "tip",
        operationId,
        actorId: adultId,
        createdAt: now,
      },
      options,
    );
    const wallet = await (await wallets()).updateOne(
      { familyId: occurrence.familyId, childId: occurrence.childId, type: walletType },
      { $inc: { balanceMinor: amountMinor }, $set: { updatedAt: now } },
      options,
    );
    if (!wallet.matchedCount) throw new Error("Falta una Hucha de este niño.");
  }
}

function toView(row: TipOccurrence, childName: string): TaskView {
  return {
    id: row._id.toHexString(),
    definitionId: row.definitionId.toHexString(),
    title: row.title,
    amountMinor: row.amountMinor,
    status: row.status,
    reviewNote: row.reviewNote,
    childName,
    occurrenceDate: row.occurrenceDate,
    read: Boolean(row.newsReadAt),
  };
}

export async function tasksForCurrentChild() {
  const child = await getChildSession();
  if (!child) return null;
  return ensureTodayTasks(child);
}

export async function pendingForCurrentAdult() {
  const adult = await requireFamilyAdult();
  if (!adult?.familyId || !adult.adultId) return null;
  return { familyId: adult.familyId, adultId: adult.adultId, tasks: await listPendingTasks(adult.familyId) };
}

export async function historyForCurrentAdult() {
  const adult = await requireFamilyAdult();
  if (!adult?.familyId || !adult.adultId) return null;
  return { tasks: await listReviewedTasks(adult.familyId) };
}
