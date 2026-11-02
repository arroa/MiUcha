import { ObjectId } from "mongodb";

import type { Child, LedgerKind, TipOccurrence } from "@/lib/collections";
import { ledgerEntries, tipOccurrences } from "@/lib/collections";
import {
  dayLabel,
  periodKeyFromIso,
  periodLabelEs,
  previousPeriodKey,
  santiagoStartUtc,
  santiagoToday,
} from "@/lib/santiago-date";

export type ChildNoticeKind = "tip" | "interest";

export type ChildNotice = {
  id: string;
  kind: ChildNoticeKind;
  when: string;
  text: string;
  read: boolean;
  sortAt: number;
  /** Tip en Mejorable: el niño puede reenviarlo sin cobro todavía. */
  canRetry?: boolean;
};

/** Una fila = una operación (Tip, transferencia, retiro, intereses). */
export type ChildMovement = {
  id: string;
  when: string;
  label: string;
  kind: LedgerKind;
  inversionMinor: number;
  gastoMinor: number;
  donacionesMinor: number;
  sortAt: number;
};

function pesos(amount: number) {
  return `$${Math.abs(amount).toLocaleString("es-CL")}`;
}

function santiagoDateFrom(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function tipText(row: TipOccurrence) {
  if (row.status === "approved") return `${row.title}: recibiste un tip de ${pesos(row.amountMinor)}.`;
  if (row.status === "rejected") return row.reviewNote ? `${row.title} no quedó hecha. ${row.reviewNote}` : `${row.title} no quedó hecha.`;
  return row.reviewNote
    ? `${row.title} puede mejorar. ${row.reviewNote} Cuando lo arregles, tócalo otra vez.`
    : `${row.title} puede mejorar. Cuando lo arregles, tócalo otra vez.`;
}

/** No leídas tienen prioridad; las leídas solo sirven para “ver leídas”. */
const NOTICE_UNREAD_CAP = 30;
const NOTICE_READ_CAP = 10;

export async function listChildNotices(child: Child): Promise<ChildNotice[]> {
  const today = santiagoToday().date;
  const fetchCap = NOTICE_UNREAD_CAP + NOTICE_READ_CAP;
  const [tips, interests] = await Promise.all([
    (await tipOccurrences())
      .find({
        childId: child._id,
        status: { $in: ["approved", "rejected", "needs_improvement"] },
        newsDismissedAt: null,
      })
      .sort({ reviewedAt: -1 })
      .limit(fetchCap)
      .toArray(),
    (await ledgerEntries())
      .find({
        childId: child._id,
        kind: "interest",
        amountMinor: { $gt: 0 },
        newsDismissedAt: null,
      })
      .sort({ createdAt: -1 })
      .limit(fetchCap)
      .toArray(),
  ]);

  const tipNotices: ChildNotice[] = tips.map((row) => {
    const whenDate = row.reviewedAt ? santiagoDateFrom(row.reviewedAt) : row.occurrenceDate;
    return {
      id: row._id.toHexString(),
      kind: "tip",
      when: dayLabel(whenDate, today),
      text: tipText(row),
      read: Boolean(row.newsReadAt),
      sortAt: (row.reviewedAt ?? row.submittedAt ?? new Date(0)).getTime(),
      canRetry: row.status === "needs_improvement",
    };
  });

  const interestNotices: ChildNotice[] = interests.map((row) => {
    const whenDate = santiagoDateFrom(row.createdAt);
    return {
      id: row._id.toHexString(),
      kind: "interest",
      when: dayLabel(whenDate, today),
      text: `Recibiste intereses de ${pesos(row.amountMinor)} en Inversión.`,
      read: Boolean(row.newsReadAt),
      sortAt: row.createdAt.getTime(),
    };
  });

  const merged = [...tipNotices, ...interestNotices].sort((a, b) => b.sortAt - a.sortAt);
  const unread = merged.filter((item) => !item.read).slice(0, NOTICE_UNREAD_CAP);
  const read = merged.filter((item) => item.read).slice(0, NOTICE_READ_CAP);
  return [...unread, ...read];
}

export async function markChildNotice(child: Child, id: string, kind: ChildNoticeKind, action: "read" | "dismiss") {
  if (!ObjectId.isValid(id)) throw new Error("Aviso no encontrado.");
  const now = new Date();
  const patch = action === "dismiss" ? { newsDismissedAt: now, newsReadAt: now } : { newsReadAt: now };

  if (kind === "tip") {
    const result = await (await tipOccurrences()).updateOne(
      {
        _id: new ObjectId(id),
        childId: child._id,
        status: { $in: ["approved", "rejected", "needs_improvement"] },
        newsDismissedAt: null,
      },
      { $set: patch },
    );
    if (!result.matchedCount) throw new Error("Ese aviso ya no está.");
    return;
  }

  const result = await (await ledgerEntries()).updateOne(
    {
      _id: new ObjectId(id),
      childId: child._id,
      kind: "interest",
      newsDismissedAt: null,
    },
    { $set: patch },
  );
  if (!result.matchedCount) throw new Error("Ese aviso ya no está.");
}

function parsePeriodKey(raw: string | undefined | null) {
  const value = (raw ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(value)) return periodKeyFromIso(santiagoToday().date);
  return value;
}

/** Últimos 12 meses Santiago, del más reciente al más viejo. */
export function recentMovementPeriods(count = 12) {
  let key = periodKeyFromIso(santiagoToday().date);
  const keys = [key];
  for (let i = 1; i < count; i += 1) {
    key = previousPeriodKey(key);
    keys.push(key);
  }
  return keys.map((periodKey) => ({ periodKey, label: periodLabelEs(periodKey) }));
}

function operationLabel(kind: LedgerKind, tipTitle?: string) {
  if (kind === "tip") return tipTitle ? `Tip · ${tipTitle}` : "Tip";
  if (kind === "interest") return "Intereses";
  if (kind === "withdrawal") return "Retiro";
  if (kind === "deposit") return "Aporte";
  if (kind === "transfer") return "Pasaste a Inversión";
  if (kind === "reversal") return "Ajuste";
  return "Movimiento";
}

export async function listChildMovements(child: Child, periodRaw?: string | null): Promise<ChildMovement[]> {
  const today = santiagoToday().date;
  const periodKey = parsePeriodKey(periodRaw);
  const start = santiagoStartUtc(`${periodKey}-01`);
  const [y, m] = periodKey.split("-").map(Number);
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const end = santiagoStartUtc(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01`);

  const rows = await (await ledgerEntries())
    .find({
      childId: child._id,
      createdAt: { $gte: start, $lt: end },
    })
    .sort({ createdAt: -1 })
    .toArray();

  type Acc = {
    id: string;
    kind: LedgerKind;
    inversionMinor: number;
    gastoMinor: number;
    donacionesMinor: number;
    sortAt: number;
    whenDate: string;
    tipOccurrenceId?: string;
  };

  const byOp = new Map<string, Acc>();
  for (const row of rows) {
    const current = byOp.get(row.operationId) ?? {
      id: row.operationId,
      kind: row.kind,
      inversionMinor: 0,
      gastoMinor: 0,
      donacionesMinor: 0,
      sortAt: row.createdAt.getTime(),
      whenDate: santiagoDateFrom(row.createdAt),
      tipOccurrenceId:
        row.kind === "tip" && row.operationId.startsWith("tipApproval:")
          ? row.operationId.slice("tipApproval:".length)
          : undefined,
    };
    if (row.walletType === "inversion") current.inversionMinor += row.amountMinor;
    if (row.walletType === "gasto") current.gastoMinor += row.amountMinor;
    if (row.walletType === "donaciones") current.donacionesMinor += row.amountMinor;
    if (row.createdAt.getTime() > current.sortAt) {
      current.sortAt = row.createdAt.getTime();
      current.whenDate = santiagoDateFrom(row.createdAt);
    }
    // Prefer tip kind if mixed (shouldn't happen)
    if (row.kind === "tip") current.kind = "tip";
    byOp.set(row.operationId, current);
  }

  const tipIds = [...byOp.values()]
    .map((row) => row.tipOccurrenceId)
    .filter((id): id is string => Boolean(id && ObjectId.isValid(id)))
    .map((id) => new ObjectId(id));
  const tipTitles = new Map<string, string>();
  if (tipIds.length) {
    const tips = await (await tipOccurrences())
      .find({ _id: { $in: tipIds }, childId: child._id })
      .project({ title: 1 })
      .toArray();
    for (const tip of tips) tipTitles.set(tip._id.toHexString(), tip.title);
  }

  return [...byOp.values()]
    .sort((a, b) => b.sortAt - a.sortAt)
    .map((row) => ({
      id: row.id,
      when: dayLabel(row.whenDate, today),
      label: operationLabel(row.kind, row.tipOccurrenceId ? tipTitles.get(row.tipOccurrenceId) : undefined),
      kind: row.kind,
      inversionMinor: row.inversionMinor,
      gastoMinor: row.gastoMinor,
      donacionesMinor: row.donacionesMinor,
      sortAt: row.sortAt,
    }));
}
