import { MongoClient, type Db, type MongoClientOptions } from "mongodb";

declare global {
  var _mihuchaMongo: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

function mongoUri() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("Define MONGODB_URI en .env.local");
  return uri;
}

/** Pool reducido: Vercel (instancias efímeras) + Atlas M0 (límite bajo de conexiones). */
function clientOptions(): MongoClientOptions {
  return {
    maxPoolSize: 5,
    minPoolSize: 0,
    maxIdleTimeMS: 60_000,
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 10_000,
  };
}

function clearClientPromise() {
  clientPromise = undefined;
  global._mihuchaMongo = undefined;
}

function createClientPromise(): Promise<MongoClient> {
  return new MongoClient(mongoUri(), clientOptions()).connect().catch((error) => {
    // Si la promesa queda cacheada rechazada, el proceso nunca se recupera.
    clearClientPromise();
    throw error;
  });
}

export function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    global._mihuchaMongo ??= createClientPromise();
    return global._mihuchaMongo;
  }
  clientPromise ??= createClientPromise();
  return clientPromise;
}

/** Solo para pruebas: fuerza un nuevo intento de conexión en la siguiente llamada. */
export function resetMongoClientForTests() {
  clearClientPromise();
}

export async function getDb(): Promise<Db> {
  const name = process.env.MONGODB_DB_NAME?.trim();
  if (!name) throw new Error("Define MONGODB_DB_NAME en .env.local");
  const client = await getMongoClient();
  return client.db(name);
}

/** Ping ligero para health checks. No expone URI ni nombres de cluster. */
export async function pingMongo(): Promise<{ latencyMs: number }> {
  const started = Date.now();
  const client = await getMongoClient();
  await client.db("admin").command({ ping: 1 });
  return { latencyMs: Date.now() - started };
}
