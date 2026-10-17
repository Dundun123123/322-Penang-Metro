import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb } from "@/db";

const COOKIE_NAME = "mutiara_session";
export type LocalUser = { id: string; email: string; name: string; role: "resident" | "team" };

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function getLocalUser(): Promise<LocalUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const id = createHash("sha256").update(token).digest("hex");
  return (
    (getDb()
      .prepare(
        `SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>?`,
      )
      .get(id, new Date().toISOString()) as LocalUser | undefined) || null
  );
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const id = createHash("sha256").update(token).digest("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 86400000);
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(now.toISOString());
  db.prepare("INSERT INTO sessions (id,user_id,expires_at,created_at) VALUES (?,?,?,?)").run(
    id,
    userId,
    expires.toISOString(),
    now.toISOString(),
  );
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires,
  });
}
export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token)
    getDb()
      .prepare("DELETE FROM sessions WHERE id=?")
      .run(createHash("sha256").update(token).digest("hex"));
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });
}
export async function teamUser() {
  const user = await getLocalUser();
  return user?.role === "team" ? user : null;
}
export function teamExists() {
  return Boolean(getDb().prepare("SELECT 1 FROM users WHERE role='team' LIMIT 1").get());
}
