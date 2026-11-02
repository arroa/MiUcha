import { describe, expect, it, vi } from "vitest";

const collection = vi.fn(() => ({ name: "families" }));
const getDb = vi.fn(async () => ({ collection }));

vi.mock("@/lib/mongodb", () => ({
  getDb: () => getDb(),
}));

describe("collections access", () => {
  it("no crea índices al obtener una colección", async () => {
    const mod = await import("@/lib/collections");
    const ensureSpy = vi.spyOn(mod, "ensureIndexes");

    await mod.families();
    await mod.wallets();
    await mod.ledgerEntries();

    expect(getDb).toHaveBeenCalled();
    expect(ensureSpy).not.toHaveBeenCalled();
    ensureSpy.mockRestore();
  });
});
