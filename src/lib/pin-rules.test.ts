import { describe, expect, it } from "vitest";

import { isPin, pinProblem, pinRules } from "@/lib/pin-rules";

describe("pinRules", () => {
  it("marca longitud incompleta como wait", () => {
    expect(pinRules("152")).toEqual({ length: "wait", repeat: "wait", sequence: "wait" });
  });

  it("acepta un PIN válido", () => {
    expect(pinRules("152634")).toEqual({ length: "ok", repeat: "ok", sequence: "ok" });
    expect(isPin("152634")).toBe(true);
  });

  it("rechaza tres iguales seguidos", () => {
    expect(pinRules("111234")).toMatchObject({ repeat: "bad" });
    expect(pinProblem("111234")).toMatch(/iguales/);
  });

  it("rechaza secuencias de tres", () => {
    expect(pinRules("123458")).toMatchObject({ sequence: "bad" });
    expect(pinProblem("987654")).toMatch(/fila/);
  });
});
