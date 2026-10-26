import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export function isPin(value: string): boolean {
  return pinProblem(value) === null;
}

export function pinProblem(value: string): string | null {
  if (!/^\d{6}$/.test(value)) return "El PIN son 6 números.";
  if (/(\d)\1\1/.test(value)) return "Sin tres números iguales seguidos, como 111.";
  for (let index = 0; index < value.length - 2; index += 1) {
    const first = Number(value[index]);
    const second = Number(value[index + 1]);
    const third = Number(value[index + 2]);
    const ascending = second === first + 1 && third === second + 1;
    const descending = second === first - 1 && third === second - 1;
    if (ascending || descending) return "Sin tres números en fila, como 123 o 321.";
  }
  return null;
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
