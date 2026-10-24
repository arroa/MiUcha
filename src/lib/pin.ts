import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export function isPin(value: string): boolean {
  return /^\d{6}$/.test(value);
}

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derived = (await scryptAsync(pin, salt, 32)) as Buffer;
  return `${salt}.${derived.toString("base64url")}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(".");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(pin, salt, 32)) as Buffer;
  const expected = Buffer.from(hash, "base64url");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}
