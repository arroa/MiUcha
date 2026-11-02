import { NextResponse } from "next/server";

import { formatClerkError } from "@/lib/clerk-users";
import { isMongoInfrastructureError, logMongoError, MONGO_UNAVAILABLE_MESSAGE } from "@/lib/mongo-infra";

export { MONGO_UNAVAILABLE_MESSAGE };

/**
 * Respuesta JSON uniforme para catch de rutas API.
 * Infra Mongo → 503 + mensaje amigable; "No autorizado." → 401; resto → status de negocio.
 */
export function jsonErrorResponse(error: unknown, fallbackStatus = 400): NextResponse {
  if (isMongoInfrastructureError(error)) {
    logMongoError("api", error);
    return NextResponse.json(
      { error: MONGO_UNAVAILABLE_MESSAGE },
      { status: 503, headers: { "Retry-After": "30" } },
    );
  }

  const message = formatClerkError(error);
  const status = message === "No autorizado." ? 401 : fallbackStatus;
  return NextResponse.json({ error: message }, { status });
}
