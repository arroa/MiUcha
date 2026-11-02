const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function weekdayOf(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function dayLabel(iso: string, today: string) {
  if (iso === today) return "Hoy";
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function santiagoToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${read("year")}-${read("month")}-${read("day")}`,
    weekday: WEEKDAYS.indexOf(read("weekday")),
  };
}

function utcDayNumber(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

/** Instant UTC en que America/Santiago muestra `YYYY-MM-DD` a las 00:00:00. */
export function santiagoStartUtc(iso: string) {
  let guess = new Date(`${iso}T15:00:00.000Z`);
  for (let i = 0; i < 8; i += 1) {
    const shown = santiagoToday(guess).date;
    const dayDelta = utcDayNumber(iso) - utcDayNumber(shown);
    if (dayDelta !== 0) {
      guess = new Date(guess.getTime() + dayDelta * 86_400_000);
      continue;
    }
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Santiago",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(guess);
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
    const offsetMs = (read("hour") * 3600 + read("minute") * 60 + read("second")) * 1000;
    if (offsetMs === 0) return guess;
    guess = new Date(guess.getTime() - offsetMs);
  }
  return guess;
}

/** Fin exclusivo del día Santiago (= inicio del día siguiente). */
export function santiagoEndExclusiveUtc(iso: string) {
  return santiagoStartUtc(addDays(iso, 1));
}

export function periodKeyFromIso(iso: string) {
  return iso.slice(0, 7);
}

export function previousPeriodKey(periodKey: string) {
  const [y, m] = periodKey.split("-").map(Number);
  const month = m === 1 ? 12 : m - 1;
  const year = m === 1 ? y - 1 : y;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function daysInPeriod(periodKey: string) {
  const [y, m] = periodKey.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: last }, (_, index) => `${periodKey}-${String(index + 1).padStart(2, "0")}`);
}

export function periodLabelEs(periodKey: string) {
  const [y, m] = periodKey.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}
