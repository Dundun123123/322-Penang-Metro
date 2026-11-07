import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scryptAsync = promisify(scrypt);
type PasswordQueue = { active: number; waiting: Array<() => void> };
const shared = globalThis as typeof globalThis & { __metroPasswordQueue?: PasswordQueue };
const queue = (shared.__metroPasswordQueue ??= { active: 0, waiting: [] });
export class PasswordBusyError extends Error {}
async function derive(password: string, salt: string): Promise<Buffer> {
  if (queue.active >= 4) {
    if (queue.waiting.length >= 32)
      throw new PasswordBusyError("Password processing is busy; try again shortly");
    await new Promise<void>((resolve) => queue.waiting.push(resolve));
  } else queue.active++;
  try {
    return (await scryptAsync(password, salt, 64)) as Buffer;
  } finally {
    const next = queue.waiting.shift();
    if (next) next();
    else queue.active--;
  }
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + (await derive(password, salt)).toString("hex");
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(":");
  if (!/^[a-f0-9]{32}$/i.test(salt || "") || !/^[a-f0-9]{128}$/i.test(hex || "")) return false;
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(hex, "hex"));
}
