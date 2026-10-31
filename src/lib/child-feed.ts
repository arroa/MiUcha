import { ObjectId } from "mongodb";

import type { Child, LedgerEntry, TipOccurrence, WalletType } from "@/lib/collections";
import { ledgerEntries, tipOccurrences } from "@/lib/collections";
import { WALLET_LABELS } from "@/lib/money";
import { dayLabel, santiagoToday } from "@/lib/santiago-date";

export type ChildNoticeKind = "tip" | "interest";

export type ChildNotice = {
  id: string;
  kind: ChildNoticeKind;
  when: string;
  text: string;
  read: boolean;
  sortAt: number;
};

export type ChildMovement = {
  id: string;
  when: string;
  label: string;
  amountMinor: number;
  walletType: WalletType;
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
  return row.reviewNote ? `${row.title} puede mejorar. ${row.reviewNote}` : `${row.title} puede mejorar.`;
}

export async function listChildNotices(child: Child): Promise<ChildNotice[]> {
  const today = santiagoToday().date;
  const [tips, interests] = await Promise.all([
    (await tipOccurrences())
      .find({
        childId: child._id,
        status: { $in: ["approved", "rejected", "needs_improvement"] },
        newsDismissedAt: null,
      })
      .sort({ reviewedAt: -1 })
      .limit(12)
      .toArray(),
    (await ledgerEntries())
      .find({
        childId: child._id,
        kind: "interest",
        amountMinor: { $gt: 0 },
        newsDismissedAt: null,
      })
      .sort({ createdAt: -1 })
      .limit(12)
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

  return [...tipNotices, ...interestNotices].sort((a, b) => b.sortAt - a.sortAt).slice(0, 16);
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

function movementLabel(row: LedgerEntry) {
  if (row.kind === "tip") return `Tip en ${WALLET_LABELS[row.walletType]}`;
  if (row.kind === "interest") return "Intereses en Inversión";
  if (row.kind === "withdrawal") return `Retiro de ${WALLET_LABELS[row.walletType]}`;
  if (row.kind === "transfer") {
    return row.amountMinor < 0 ? `Pasaste a Inversión` : `Llegó desde Gasto`;
  }
  if (row.kind === "reversal") return "Ajuste";
  return "Movimiento";
}

export async function listChildMovements(child: Child): Promise<ChildMovement[]> {
  const today = santiagoToday().date;
  const rows = await (await ledgerEntries())
    .find({ childId: child._id })
    .sort({ createdAt: -1 })
    .limit(40)
    .toArray();

  return rows.map((row) => {
    const whenDate = santiagoDateFrom(row.createdAt);
    return {
      id: row._id.toHexString(),
      when: dayLabel(whenDate, today),
      label: movementLabel(row),
      amountMinor: row.amountMinor,
      walletType: row.walletType,
      sortAt: row.createdAt.getTime(),
    };
  });
}
