export type PinRuleState = "wait" | "ok" | "bad";

export function pinRules(value: string): { length: PinRuleState; repeat: PinRuleState; sequence: PinRuleState } {
  const pin = value.replace(/\D/g, "").slice(0, 6);
  const complete = pin.length === 6;
  return {
    length: complete ? "ok" : "wait",
    repeat: hasTriple(pin) ? "bad" : complete ? "ok" : "wait",
    sequence: hasRun(pin) ? "bad" : complete ? "ok" : "wait",
  };
}

export function isPin(value: string): boolean {
  return pinProblem(value) === null;
}

export function pinProblem(value: string): string | null {
  if (!/^\d{6}$/.test(value)) return "El PIN son 6 números.";
  if (hasTriple(value)) return "Sin tres números iguales seguidos, como 111.";
  if (hasRun(value)) return "Sin tres números en fila, como 123 o 321.";
  return null;
}

function hasTriple(value: string) {
  return /(\d)\1\1/.test(value);
}

function hasRun(value: string) {
  for (let index = 0; index < value.length - 2; index += 1) {
    const first = Number(value[index]);
    const second = Number(value[index + 1]);
    const third = Number(value[index + 2]);
    const ascending = second === first + 1 && third === second + 1;
    const descending = second === first - 1 && third === second - 1;
    if (ascending || descending) return true;
  }
  return false;
}
