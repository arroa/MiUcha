import { beforeEach, describe, expect, it, vi } from "vitest";

const endSession = vi.fn(async () => undefined);
const withTransaction = vi.fn();
const startSession = vi.fn(() => ({ withTransaction, endSession }));
const getMongoClient = vi.fn(async () => ({ startSession }));

vi.mock("@/lib/mongodb", () => ({
  getMongoClient: () => getMongoClient(),
}));
vi.mock("@/lib/child-account", () => ({ getChildSession: vi.fn() }));
vi.mock("@/lib/collections", () => ({
  children: vi.fn(),
  depositRequests: vi.fn(),
  ledgerEntries: vi.fn(),
  wallets: vi.fn(),
  withdrawalRequests: vi.fn(),
}));
vi.mock("@/lib/family-admin", () => ({
  requireBanquero: vi.fn(),
  requireFamilyAdult: vi.fn(),
}));
vi.mock("@/lib/family-sync", () => ({ bumpFamilySync: vi.fn() }));

describe("inMoneySession", () => {
  beforeEach(() => {
    vi.resetModules();
    endSession.mockClear();
    withTransaction.mockReset();
    startSession.mockClear();
    getMongoClient.mockClear();
  });

  it("ejecuta el trabajo solo dentro de withTransaction", async () => {
    const work = vi.fn(async (_session: unknown) => undefined);
    withTransaction.mockImplementation(async (fn: () => Promise<void>) => {
      await fn();
    });

    const { inMoneySession } = await import("@/lib/money");
    await inMoneySession(work);

    expect(withTransaction).toHaveBeenCalledOnce();
    expect(work).toHaveBeenCalledOnce();
    expect(work.mock.calls[0]?.[0]).toBeDefined();
    expect(endSession).toHaveBeenCalledOnce();
  });

  it("no reejecuta fuera de transacción ante error de réplica/transacciones", async () => {
    const work = vi.fn(async () => undefined);
    withTransaction.mockRejectedValue(
      Object.assign(new Error("Transaction numbers are only allowed on a replica set member or mongos"), {
        code: 20,
        codeName: "IllegalOperation",
      }),
    );

    const { inMoneySession } = await import("@/lib/money");
    await expect(inMoneySession(work)).rejects.toThrow(/Transaction numbers|replica set/i);
    expect(work).not.toHaveBeenCalled();
    expect(endSession).toHaveBeenCalledOnce();
  });

  it("aborta completo si la transacción falla a mitad (sin fallback)", async () => {
    let ran = 0;
    withTransaction.mockImplementation(async (fn: () => Promise<void>) => {
      await fn();
    });

    const { inMoneySession } = await import("@/lib/money");
    await expect(
      inMoneySession(async () => {
        ran += 1;
        throw Object.assign(new Error("not primary"), { code: 10107, name: "MongoServerError" });
      }),
    ).rejects.toThrow(/not primary/i);

    expect(ran).toBe(1);
    expect(endSession).toHaveBeenCalledOnce();
  });

  it("simula pérdida de conexión durante operación monetaria y no duplica trabajo", async () => {
    const ledgerWrites: string[] = [];
    withTransaction.mockImplementation(async (fn: () => Promise<void>) => {
      await fn();
    });

    const { inMoneySession } = await import("@/lib/money");
    await expect(
      inMoneySession(async () => {
        ledgerWrites.push("debit");
        throw Object.assign(new Error("connection timed out"), { name: "MongoNetworkTimeoutError" });
      }),
    ).rejects.toThrow(/timed out/i);

    // Un solo intento parcial; la transacción aborta (sin segundo pass sin sesión).
    expect(ledgerWrites).toEqual(["debit"]);
    expect(withTransaction).toHaveBeenCalledOnce();
  });
});
