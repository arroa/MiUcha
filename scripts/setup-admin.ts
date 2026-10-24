import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { ensureClerkUser, formatClerkError, normalizeEmail } from "../src/lib/clerk-users";

async function setupAdmin() {
  const rawEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!rawEmail?.trim()) throw new Error("Define SUPER_ADMIN_EMAIL en .env.local");

  const email = normalizeEmail(rawEmail);
  console.log("→ Creando al superusuario en Clerk…");
  const clerkUserId = await ensureClerkUser(email);
  console.log("  Identidad OK:", clerkUserId);
  console.log("  email:", email);
  console.log("");
  console.log("Entra en /sign-in con ese correo. Desde Familia creas cada familia y a su banquero.");
  process.exit(0);
}

setupAdmin().catch((error) => {
  console.error("setup:admin falló:", formatClerkError(error));
  process.exit(1);
});
