import { MongoClient, type Db } from "mongodb";

declare global {
  var _miuchaMongo: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

function mongoUri() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("Define MONGODB_URI en .env.local");
  return uri;
}

export function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    global._miuchaMongo ??= new MongoClient(mongoUri()).connect();
    return global._miuchaMongo;
  }
  clientPromise ??= new MongoClient(mongoUri()).connect();
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const name = process.env.MONGODB_DB_NAME?.trim();
  if (!name) throw new Error("Define MONGODB_DB_NAME en .env.local");
  const client = await getMongoClient();
  return client.db(name);
}
