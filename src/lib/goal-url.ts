/** Normaliza y comprueba enlaces de producto para objetivos. */

const MAX_URL_LEN = 500;
const VERIFY_TIMEOUT_MS = 5000;

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

function looksPrivateHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) return true;
  if (/^169\.254\.\d+\.\d+$/.test(host)) return true;
  return false;
}

/** Acepta `www.lun.com`, `lun.com/x` o un enlace completo. */
export function sanitizeProductUrl(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string") throw new Error("El enlace no es válido.");
  let trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_URL_LEN) throw new Error("El enlace es demasiado largo.");

  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Ese enlace no se entiende. Prueba con la dirección de la tienda.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Solo se permiten enlaces de páginas web.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Ese enlace no se puede usar.");
  }
  if (!parsed.hostname || looksPrivateHost(parsed.hostname)) {
    throw new Error("Ese enlace no se puede usar.");
  }

  return parsed.toString();
}

/** Comprueba que el enlace responde (cualquier respuesta HTTP cuenta). */
export async function verifyProductUrl(url: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "MiHuchaBot/1.0",
      },
    });
    // 2xx–4xx = el sitio existe; 5xx o red caída = no sirve
    if (response.status >= 500) {
      throw new Error("Esa página no respondió bien. Revisa el enlace.");
    }
  } catch (error) {
    if (error instanceof Error && /Revisa el enlace|no respondió/.test(error.message)) throw error;
    throw new Error("No pudimos abrir ese enlace. Revisa que esté bien escrito.");
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveProductUrl(raw: unknown): Promise<string | null> {
  const url = sanitizeProductUrl(raw);
  if (!url) return null;
  await verifyProductUrl(url);
  return url;
}

export function productLinkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || "Ver en la tienda";
  } catch {
    return "Ver en la tienda";
  }
}
