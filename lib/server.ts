import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../app/chatgpt-auth";
import { getDb } from "../db";
import { admins } from "../db/schema";

export const validKinds = ["closure", "schedule", "transport", "safety", "business"] as const;
export const validStatuses = ["received", "reviewing", "assigned", "resolved", "closed"] as const;

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function adminUser() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const found = await getDb().select().from(admins).where(eq(admins.userId, user.userId)).limit(1);
  return found.length ? user : null;
}

export function setupKey() {
  return env.ADMIN_SETUP_KEY || "";
}

export function trim(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  const value: unknown = await request.json().catch(() => null);
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function isEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function randomHex(bytes = 8) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data, (n) => n.toString(16).padStart(2, "0")).join("");
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
}
