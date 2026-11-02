import { connection, NextResponse } from "next/server";

import { logMongoError } from "@/lib/mongo-infra";
import { pingMongo } from "@/lib/mongodb";

/**
 * Salud mínima: conectividad MongoDB.
 * No revela URI, cluster, nombres de DB ni detalles internos.
 */
export async function GET() {
  await connection();

  try {
    const { latencyMs } = await pingMongo();
    return NextResponse.json({
      ok: true,
      mongo: "up",
      latencyMs,
    });
  } catch (error) {
    logMongoError("health", error);
    return NextResponse.json(
      {
        ok: false,
        mongo: "down",
      },
      { status: 503, headers: { "Retry-After": "30" } },
    );
  }
}
