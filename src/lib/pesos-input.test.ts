import { describe, expect, it } from "vitest";

import { parsePesosInput } from "@/lib/pesos-input";

describe("parsePesosInput", () => {
  it("acepta pesos enteros positivos", () => {
    expect(parsePesosInput("1500")).toEqual({ ok: true, value: 1500 });
  });

  it("rechaza vacío, decimales y negativos", () => {
    expect(parsePesosInput("")).toMatchObject({ ok: false });
    expect(parsePesosInput("1.5")).toMatchObject({ ok: false });
    expect(parsePesosInput("-10")).toMatchObject({ ok: false });
  });
});
