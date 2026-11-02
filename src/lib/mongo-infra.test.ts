import { describe, expect, it, vi } from "vitest";
import { MongoNetworkError, MongoServerError } from "mongodb";

import { isMongoInfrastructureError, MONGO_UNAVAILABLE_MESSAGE } from "@/lib/mongo-infra";
import { jsonErrorResponse } from "@/lib/http-errors";

function namedError(name: string, message: string) {
  return Object.assign(new Error(message), { name });
}

describe("isMongoInfrastructureError", () => {
  it("detecta errores de red y selección de servidor", () => {
    expect(isMongoInfrastructureError(new MongoNetworkError("connection reset"))).toBe(true);
    expect(isMongoInfrastructureError(namedError("MongoServerSelectionError", "Server selection timed out"))).toBe(true);
  });

  it("detecta cambio de primario / códigos transitorios", () => {
    const steppedDown = new MongoServerError({ message: "Primary stepped down", ok: 0, code: 189 });
    expect(isMongoInfrastructureError(steppedDown)).toBe(true);
    const notPrimary = new MongoServerError({ message: "not primary", ok: 0, code: 10107 });
    expect(isMongoInfrastructureError(notPrimary)).toBe(true);
  });

  it("no trata errores de negocio como infraestructura", () => {
    const duplicate = new MongoServerError({ message: "E11000 duplicate key", ok: 0, code: 11000 });
    expect(isMongoInfrastructureError(duplicate)).toBe(false);
    expect(isMongoInfrastructureError(new Error("No hay suficiente disponible en Gasto."))).toBe(false);
  });

  it("inspecciona cause anidada", () => {
    const wrapped = new Error("falló la operación", {
      cause: new MongoNetworkError("ECONNREFUSED"),
    });
    expect(isMongoInfrastructureError(wrapped)).toBe(true);
  });
});

describe("jsonErrorResponse", () => {
  it("responde 503 con mensaje amigable ante infra Mongo", async () => {
    const res = jsonErrorResponse(namedError("MongoServerSelectionError", "Server selection timed out"));
    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBe("30");
    await expect(res.json()).resolves.toEqual({ error: MONGO_UNAVAILABLE_MESSAGE });
  });

  it("mantiene 400 para errores de negocio", async () => {
    const res = jsonErrorResponse(new Error("El monto es un número de pesos mayor que cero."));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("monto");
    expect(body.error).not.toBe(MONGO_UNAVAILABLE_MESSAGE);
  });

  it("mapea No autorizado a 401", () => {
    expect(jsonErrorResponse(new Error("No autorizado.")).status).toBe(401);
  });
});

describe("logMongoError (sin filtrar URI)", () => {
  it("serializa contexto sin lanzar", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { logMongoError } = await import("@/lib/mongo-infra");
    logMongoError("test", new MongoNetworkError("boom"));
    expect(spy).toHaveBeenCalledOnce();
    const payload = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(payload.kind).toBe("mongo_infrastructure");
    expect(payload.context).toBe("test");
    spy.mockRestore();
  });
});
