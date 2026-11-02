import { ObjectId } from "mongodb";

import {
  children,
  families,
  ledgerEntries,
  rentabilidadPagos,
  wallets,
  type Family,
} from "@/lib/collections";
import { requireBanquero } from "@/lib/family-admin";
import { bumpFamilySync } from "@/lib/family-sync";
import { inMoneySession } from "@/lib/money";
import {
  addDays,
  daysInPeriod,
  periodKeyFromIso,
  periodLabelEs,
  previousPeriodKey,
  santiagoEndExclusiveUtc,
  santiagoToday,
} from "@/lib/santiago-date";

const DAY_BASE = 30;
const DEFAULT_INTEREST_PERCENT = 10;

export type DayBalanceRow = {
  date: string;
  balanceMinor: number;
  interestMinor: number;
};

export type ChildRentabilidadPreview = {
  childId: string;
  childName: string;
  paid: boolean;
  paidAt: string | null;
  paidMinor: number | null;
  calculatedMinor: number;
  discretionaryMinor: number | null;
  /** Tasa mensual % usada para esta vista (familia actual o la del pago). */
  interestPercent: number;
  days: DayBalanceRow[];
};

export type RentabilidadPreview = {
  periodKey: string;
  periodLabel: string;
  partial: boolean;
  daysIncluded: number;
  lastDayIncluded: string | null;
  interestPercent: number;
  dailyFactor: number;
  children: ChildRentabilidadPreview[];
  nag: { show: boolean; periodKey: string; periodLabel: string; pendingCount: number };
  selectablePeriods: { periodKey: string; periodLabel: string; partial: boolean }[];
};

function interestOperationId(familyId: string, childId: string, periodKey: string) {
  return `interest:${familyId}:${childId}:${periodKey}`;
}

function parsePeriodKey(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error("El mes no es válido.");
  return value;
}

function includedDaysForPeriod(periodKey: string, todayIso: string) {
  const current = periodKeyFromIso(todayIso);
  const all = daysInPeriod(periodKey);
  if (periodKey > current) throw new Error("Ese mes todavía no existe.");
  if (periodKey < current) return { days: all, partial: false };
  // Mes en curso: solo días cerrados (hasta ayer).
  const yesterday = addDays(todayIso, -1);
  const days = all.filter((day) => day <= yesterday);
  return { days, partial: true };
}

export function dayInterestMinor(balanceMinor: number, interestPercent: number) {
  if (interestPercent <= 0) return 0;
  const factor = interestPercent / 100 / DAY_BASE;
  return Math.floor(Math.max(0, balanceMinor) * factor);
}

export function withDayInterest(
  rows: { date: string; balanceMinor: number }[],
  interestPercent: number,
): DayBalanceRow[] {
  return rows.map((row) => ({
    date: row.date,
    balanceMinor: row.balanceMinor,
    interestMinor: dayInterestMinor(row.balanceMinor, interestPercent),
  }));
}

/** Suma de interés diario (piso por día) para que la tabla cuadre con el total. */
export function calculateInterestMinor(days: DayBalanceRow[], interestPercent: number) {
  if (days.length === 0) return 0;
  if (days.every((row) => typeof row.interestMinor === "number")) {
    return days.reduce((sum, row) => sum + Math.max(0, row.interestMinor), 0);
  }
  return withDayInterest(days, interestPercent).reduce((sum, row) => sum + row.interestMinor, 0);
}

async function dailyInversionBalances(familyId: ObjectId, childId: ObjectId, days: string[]) {
  if (days.length === 0) return [] as { date: string; balanceMinor: number }[];
  const lastExclusive = santiagoEndExclusiveUtc(days[days.length - 1]);
  const entries = await (await ledgerEntries())
    .find({
      familyId,
      childId,
      walletType: "inversion",
      createdAt: { $lt: lastExclusive },
    })
    .project({ amountMinor: 1, createdAt: 1 })
    .sort({ createdAt: 1 })
    .toArray();

  const ends = days.map((day) => santiagoEndExclusiveUtc(day).getTime());
  const rows: { date: string; balanceMinor: number }[] = days.map((date) => ({ date, balanceMinor: 0 }));
  let balance = 0;
  let entryIndex = 0;
  for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
    const end = ends[dayIndex];
    while (entryIndex < entries.length && entries[entryIndex].createdAt.getTime() < end) {
      balance += entries[entryIndex].amountMinor;
      entryIndex += 1;
    }
    rows[dayIndex] = { date: days[dayIndex], balanceMinor: balance };
  }
  return rows;
}

async function paidMap(familyId: ObjectId, periodKey: string, childIds: ObjectId[]) {
  const rows = await (await rentabilidadPagos())
    .find({ familyId, periodKey, childId: { $in: childIds } })
    .toArray();
  return new Map(rows.map((row) => [row.childId.toHexString(), row]));
}

function nagWindow(todayIso: string) {
  const day = Number(todayIso.slice(8, 10));
  return day >= 1 && day <= 5;
}

export async function previewRentabilidadForBanquero(periodKeyRaw?: string): Promise<RentabilidadPreview> {
  const adult = await requireBanquero();
  if (!adult?.familyId) throw new Error("No autorizado.");
  const familyId = new ObjectId(adult.familyId);
  const family = await (await families()).findOne({ _id: familyId });
  if (!family) throw new Error("Familia no encontrada.");

  const today = santiagoToday().date;
  const previous = previousPeriodKey(periodKeyFromIso(today));
  const periodKey = parsePeriodKey(periodKeyRaw?.trim() || previous);
  const { days, partial } = includedDaysForPeriod(periodKey, today);
  if (periodKey === periodKeyFromIso(today) && days.length === 0) {
    throw new Error("Todavía no hay días cerrados de este mes. Prueba mañana o elige el mes anterior.");
  }

  const interestPercent =
    typeof family.interestPercent === "number" && Number.isFinite(family.interestPercent)
      ? Math.max(0, Math.floor(family.interestPercent))
      : DEFAULT_INTEREST_PERCENT;

  const childRows = await (await children()).find({ familyId, active: true }).sort({ name: 1 }).toArray();
  const childIds = childRows.map((child) => child._id);
  const paid = await paidMap(familyId, periodKey, childIds);

  const previews: ChildRentabilidadPreview[] = [];
  for (const child of childRows) {
    const payment = paid.get(child._id.toHexString());
    const rateUsed =
      payment && typeof payment.interestPercent === "number" ? payment.interestPercent : interestPercent;
    const dayRows =
      payment?.days && payment.days.length > 0
        ? payment.days.map((row) => ({
            date: row.date,
            balanceMinor: row.balanceMinor,
            interestMinor: row.interestMinor,
          }))
        : withDayInterest(await dailyInversionBalances(familyId, child._id, days), rateUsed);
    previews.push({
      childId: child._id.toHexString(),
      childName: child.name,
      paid: Boolean(payment),
      paidAt: payment?.paidAt?.toISOString() ?? null,
      paidMinor: payment?.paidMinor ?? null,
      calculatedMinor: payment?.calculatedMinor ?? calculateInterestMinor(dayRows, rateUsed),
      discretionaryMinor: payment?.discretionaryMinor ?? null,
      interestPercent: rateUsed,
      days: dayRows,
    });
  }

  const prevPaid = await paidMap(familyId, previous, childIds);
  const pendingPrevious = childRows.filter((child) => !prevPaid.has(child._id.toHexString())).length;

  /** Últimos 12 meses seleccionables (incluye cerrados ya abonados). */
  const HISTORY_MONTHS = 12;
  const currentKey = periodKeyFromIso(today);
  const currentDays = includedDaysForPeriod(currentKey, today).days;
  const selectable: RentabilidadPreview["selectablePeriods"] = [];
  let cursor = currentDays.length > 0 ? currentKey : previous;
  for (let i = 0; i < HISTORY_MONTHS; i += 1) {
    selectable.push({
      periodKey: cursor,
      periodLabel: periodLabelEs(cursor),
      partial: cursor === currentKey,
    });
    cursor = previousPeriodKey(cursor);
  }

  return {
    periodKey,
    periodLabel: periodLabelEs(periodKey),
    partial,
    daysIncluded: days.length,
    lastDayIncluded: days[days.length - 1] ?? null,
    interestPercent,
    dailyFactor: interestPercent / 100 / DAY_BASE,
    children: previews,
    nag: {
      show: nagWindow(today) && pendingPrevious > 0,
      periodKey: previous,
      periodLabel: periodLabelEs(previous),
      pendingCount: pendingPrevious,
    },
    selectablePeriods: selectable,
  };
}

export async function settleRentabilidadForBanquero(input: {
  childId: string;
  periodKey: string;
  discretionaryMinor?: unknown;
}) {
  const adult = await requireBanquero();
  if (!adult?.familyId || !adult.adultId) throw new Error("No autorizado.");
  if (!ObjectId.isValid(input.childId)) throw new Error("Niño no encontrado.");

  const periodKey = parsePeriodKey(input.periodKey);
  const discretionaryRaw = input.discretionaryMinor ?? 0;
  const discretionaryMinor =
    typeof discretionaryRaw === "number" ? discretionaryRaw : Number(discretionaryRaw);
  if (!Number.isInteger(discretionaryMinor)) throw new Error("El ajuste discrecional debe ser un número entero de pesos.");

  const familyId = new ObjectId(adult.familyId);
  const childId = new ObjectId(input.childId);
  const family = await (await families()).findOne({ _id: familyId });
  if (!family) throw new Error("Familia no encontrada.");
  const child = await (await children()).findOne({ _id: childId, familyId, active: true });
  if (!child) throw new Error("Niño no encontrado.");

  const today = santiagoToday().date;
  const { days, partial } = includedDaysForPeriod(periodKey, today);
  if (days.length === 0) throw new Error("Todavía no hay días cerrados para ese mes.");

  const existing = await (await rentabilidadPagos()).findOne({ familyId, childId, periodKey });
  if (existing) throw new Error("La rentabilidad de ese mes ya está abonada para este niño.");

  const interestPercent =
    typeof family.interestPercent === "number" && Number.isFinite(family.interestPercent)
      ? Math.max(0, Math.floor(family.interestPercent))
      : DEFAULT_INTEREST_PERCENT;
  const dayRows = withDayInterest(await dailyInversionBalances(familyId, childId, days), interestPercent);
  const calculatedMinor = calculateInterestMinor(dayRows, interestPercent);
  const paidMinor = Math.max(0, calculatedMinor + discretionaryMinor);
  const operationId = interestOperationId(familyId.toHexString(), childId.toHexString(), periodKey);
  const now = new Date();

  await inMoneySession(async (session) => {
    const options = { session };
    const alreadyLedger = await (await ledgerEntries()).findOne({ operationId, walletType: "inversion" }, options);
    if (alreadyLedger) throw new Error("La rentabilidad de ese mes ya está abonada para este niño.");

    if (paidMinor > 0) {
      const credited = await (await wallets()).updateOne(
        { familyId, childId, type: "inversion" },
        { $inc: { balanceMinor: paidMinor }, $set: { updatedAt: now } },
        options,
      );
      if (!credited.matchedCount) throw new Error("Falta la Hucha de Inversión.");
      await (await ledgerEntries()).insertOne(
        {
          _id: new ObjectId(),
          familyId,
          childId,
          walletType: "inversion",
          amountMinor: paidMinor,
          kind: "interest",
          operationId,
          actorId: adult.adultId!,
          createdAt: now,
        },
        options,
      );
    }

    await (await rentabilidadPagos()).insertOne(
      {
        _id: new ObjectId(),
        familyId,
        childId,
        periodKey,
        calculatedMinor,
        discretionaryMinor,
        paidMinor,
        partial,
        interestPercent,
        daysIncluded: days.length,
        days: dayRows,
        operationId,
        paidBy: new ObjectId(adult.adultId!),
        paidAt: now,
      },
      options,
    );
    await bumpFamilySync(familyId, session);
  });

  return {
    childId: child._id.toHexString(),
    childName: child.name,
    periodKey,
    calculatedMinor,
    discretionaryMinor,
    paidMinor,
    partial,
    walletType: "inversion" as const,
  };
}

export function defaultInterestPercent(family: Pick<Family, "interestPercent">) {
  return typeof family.interestPercent === "number" && Number.isFinite(family.interestPercent)
    ? Math.max(0, Math.floor(family.interestPercent))
    : DEFAULT_INTEREST_PERCENT;
}
