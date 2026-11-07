import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/db";

const COOKIE_NAME = "mutiara_session";
export type LocalUser = {
  id: string;
  email: string;
  name: string;
  role: "resident" | "team" | "authority";
  department: string | null;
};

export { hashPassword, verifyPassword, PasswordBusyError } from "@/lib/password";
export async function getLocalUser(): Promise<LocalUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const id = createHash("sha256").update(token).digest("hex");
  return (
    ((await getDb()
      .prepare(
        `SELECT u.id,u.email,u.name,CASE WHEN u.role='team' AND u.staff_kind='authority' THEN 'authority' ELSE u.role END AS role,u.department FROM auth_session s JOIN app_user u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>?`,
      )
      .get(id, new Date().toISOString())) as LocalUser | undefined) || null
  );
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const id = createHash("sha256").update(token).digest("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 86400000);
  const db = getDb();
  await db.prepare("DELETE FROM auth_session WHERE expires_at<=?").run(now.toISOString());
  await db
    .prepare("INSERT INTO auth_session (id,user_id,expires_at,gmt_create) VALUES (?,?,?,?)")
    .run(id, userId, expires.toISOString(), now.toISOString());
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
    await getDb()
      .prepare("DELETE FROM auth_session WHERE id=?")
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
export async function authorityUser() {
  const user = await getLocalUser();
  return user?.role === "authority" ? user : null;
}
export async function staffUser() {
  const user = await getLocalUser();
  return user?.role === "team" || user?.role === "authority" ? user : null;
}
export async function teamExists() {
  return Boolean(
    await getDb()
      .prepare(
        "SELECT 1 FROM app_user WHERE role='team' AND COALESCE(staff_kind,'team')='team' LIMIT 1",
      )
      .get(),
  );
}
