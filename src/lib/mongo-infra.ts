import {
  MongoError,
  MongoNetworkError,
  MongoServerError,
  MongoServerSelectionError,
  MongoTopologyClosedError,
} from "mongodb";

/** Mensaje amigable cuando MongoDB no responde o la topología está inestable. */
export const MONGO_UNAVAILABLE_MESSAGE =
  "El servicio está temporalmente no disponible. Inténtalo de nuevo en unos minutos.";

const TRANSIENT_SERVER_CODES = new Set([
  6, // HostUnreachable
  7, // HostNotFound
  89, // NetworkTimeout
  91, // ShutdownInProgress
  189, // PrimarySteppedDown
  9001, // SocketException
  10107, // NotWritablePrimary
  11600, // InterruptedAtShutdown
  11602, // InterruptedDueToReplStateChange
  13435, // NotPrimaryNoSecondaryOk
  13436, // NotPrimaryOrSecondary
]);

function errorName(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  return "name" in error && typeof error.name === "string" ? error.name : "";
}

function errorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  return "message" in error && typeof error.message === "string" ? error.message : "";
}

function errorCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("code" in error && typeof error.code === "number") return error.code;
  return undefined;
}

/**
 * Errores de infraestructura / topología: la app debe responder 503 y permitir reintento.
 * No incluye errores de negocio (validación, duplicados 11000, etc.).
 */
export function isMongoInfrastructureError(error: unknown): boolean {
  if (!error) return false;

  if (
    error instanceof MongoNetworkError ||
    error instanceof MongoServerSelectionError ||
    error instanceof MongoTopologyClosedError
  ) {
    return true;
  }

  const name = errorName(error);
  if (
    name === "MongoNetworkError" ||
    name === "MongoServerSelectionError" ||
    name === "MongoTimeoutError" ||
    name === "MongoNetworkTimeoutError" ||
    name === "MongoTopologyClosedError" ||
    name === "MongoNotConnectedError" ||
    name === "MongoExpiredSessionError"
  ) {
    return true;
  }

  const code = errorCode(error);
  if (typeof code === "number" && TRANSIENT_SERVER_CODES.has(code)) return true;

  if (error instanceof MongoServerError || error instanceof MongoError) {
    const message = errorMessage(error).toLowerCase();
    if (
      message.includes("not primary") ||
      message.includes("notwritableprimary") ||
      message.includes("interrupted due to replstatechange") ||
      message.includes("topology is closed") ||
      message.includes("server selection timed out") ||
      message.includes("connection timed out") ||
      message.includes("econnrefused") ||
      message.includes("econnreset") ||
      (message.includes("socket") && message.includes("closed"))
    ) {
      return true;
    }
  }

  const message = errorMessage(error).toLowerCase();
  if (
    message.includes("server selection timed out") ||
    message.includes("connection timed out") ||
    message.includes("econnrefused") ||
    message.includes("mongoserverselectionerror") ||
    message.includes("topology was destroyed") ||
    message.includes("topology is closed")
  ) {
    return true;
  }

  if (error instanceof Error && error.cause) return isMongoInfrastructureError(error.cause);
  return false;
}

/** Log técnico estructurado; no incluye URI ni documentos. */
export function logMongoError(context: string, error: unknown, extra?: Record<string, unknown>) {
  const payload = {
    level: "error",
    service: "mihucha",
    context,
    kind: "mongo_infrastructure",
    name: errorName(error) || "Error",
    code: errorCode(error) ?? null,
    message: errorMessage(error).slice(0, 300),
    at: new Date().toISOString(),
    ...extra,
  };
  console.error(JSON.stringify(payload));
}
