import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (!match) continue;
  const key = match[1].trim();
  let value = match[2].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  process.env[key] ??= value;
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "miucha";
if (!uri) {
  console.error("FAIL missing MONGODB_URI");
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });
try {
  await client.connect();
  const n = await client.db(dbName).collection("families").countDocuments();
  console.log(`OK db=${dbName} families=${n}`);
} catch (error) {
  console.error("FAIL", error?.name, error?.message);
  if (error?.reason?.type) console.error("topology", error.reason.type);
  process.exit(1);
} finally {
  await client.close().catch(() => {});
}
