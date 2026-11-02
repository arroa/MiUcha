import { describe, expect, it } from "vitest";

import { formatPesosGrouped, parsePesosInput } from "@/lib/pesos-input";

describe("parsePesosInput", () => {
  it("acepta pesos enteros y separador de miles", () => {
    expect(parsePesosInput("1500")).toEqual({ ok: true, value: 1500 });
    expect(parsePesosInput("40.000")).toEqual({ ok: true, value: 40000 });
  });

  it("rechaza vacío o sin dígitos", () => {
    expect(parsePesosInput("")).toMatchObject({ ok: false });
    expect(parsePesosInput("-")).toMatchObject({ ok: false });
  });
});

describe("formatPesosGrouped", () => {
  it("formatea con miles es-CL", () => {
    expect(formatPesosGrouped(40000)).toBe("40.000");
    expect(formatPesosGrouped("asdasd40000xyz")).toBe("40.000");
  });
});
