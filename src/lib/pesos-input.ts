/** Valida montos en pesos enteros sin transformar la entrada. */
export function parsePesosInput(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Escribe un monto." };
  if (trimmed.includes("-")) return { ok: false, error: "El monto no puede ser negativo." };
  if (trimmed.includes(",") || trimmed.includes(".")) {
    return { ok: false, error: "Usa solo pesos enteros, sin decimales ni comas." };
  }
  if (!/^\d+$/.test(trimmed)) return { ok: false, error: "Escribe solo números." };
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value <= 0) {
    return { ok: false, error: "El monto tiene que ser un número entero mayor que cero." };
  }
  return { ok: true, value };
}
