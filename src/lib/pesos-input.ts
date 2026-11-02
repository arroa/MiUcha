/** Montos en pesos enteros. Acepta separadores de miles; ignora todo lo que no sea dígito. */

export function digitsFromPesosInput(raw: string) {
  return raw.replace(/\D/g, "");
}

/** `40000` → `40.000` (es-CL). */
export function formatPesosGrouped(raw: string | number) {
  const digits = typeof raw === "number" ? String(Math.trunc(Math.abs(raw))) : digitsFromPesosInput(raw);
  if (!digits) return "";
  return Number(digits).toLocaleString("es-CL");
}

export function parsePesosInput(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const digits = digitsFromPesosInput(raw);
  if (!digits) return { ok: false, error: "Escribe un monto." };
  const value = Number(digits);
  if (!Number.isSafeInteger(value) || value <= 0) {
    return { ok: false, error: "El monto tiene que ser un número entero mayor que cero." };
  }
  return { ok: true, value };
}
