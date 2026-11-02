import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const connectMock = vi.fn();

vi.mock("mongodb", () => {
  class FakeClient {
    connect = connectMock;
    db() {
      return { command: vi.fn() };
    }
  }
  return {
    MongoClient: vi.fn(function MongoClient() {
      return new FakeClient();
    }),
  };
});

describe("getMongoClient reconnection", () => {
  beforeEach(() => {
    vi.resetModules();
    connectMock.mockReset();
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    process.env.MONGODB_DB_NAME = "test";
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("limpia la promesa rechazada y permite un nuevo intento", async () => {
    connectMock
      .mockRejectedValueOnce(new Error("server selection timed out"))
      .mockResolvedValueOnce({ db: () => ({}) });

    const { getMongoClient, resetMongoClientForTests } = await import("@/lib/mongodb");
    resetMongoClientForTests();

    await expect(getMongoClient()).rejects.toThrow(/timed out/i);
    await expect(getMongoClient()).resolves.toBeTruthy();
    expect(connectMock).toHaveBeenCalledTimes(2);
  });

  it("reutiliza la misma promesa mientras conecta con éxito", async () => {
    const client = { db: () => ({}) };
    connectMock.mockResolvedValue(client);

    const { getMongoClient, resetMongoClientForTests } = await import("@/lib/mongodb");
    resetMongoClientForTests();

    const [a, b] = await Promise.all([getMongoClient(), getMongoClient()]);
    expect(a).toBe(b);
    expect(connectMock).toHaveBeenCalledTimes(1);
  });
});
