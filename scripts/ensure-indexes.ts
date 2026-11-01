import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const { ensureIndexes } = await import("../src/lib/collections");
  console.log("→ Creando índices / colecciones en Mongo…");
  await ensureIndexes();
  console.log("  OK");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
