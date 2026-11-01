/** Valida URLs de producto para objetivos. Sin fetch remoto. */

const MAX_URL_LEN = 500;

export function sanitizeProductUrl(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string") throw new Error("El enlace no es válido.");
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_URL_LEN) throw new Error("El enlace es demasiado largo.");

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Pega un enlace completo que empiece con https://");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Solo se permiten enlaces http o https.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Ese enlace no se puede usar.");
  }

  return parsed.toString();
}

export function productLinkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || "Ver en la tienda";
  } catch {
    return "Ver en la tienda";
  }
}
