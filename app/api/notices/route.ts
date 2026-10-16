import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { notices } from "@/db/schema";
import { adminUser, jsonError, readJsonObject, sameOrigin, trim, validKinds } from "@/lib/server";

export async function GET(request: Request) {
  const db = getDb();
  const all = new URL(request.url).searchParams.get("all") === "1";
  if (all && !(await adminUser())) return jsonError("Forbidden", 403);
  const rows = all
    ? await db.select().from(notices).orderBy(desc(notices.createdAt)).limit(200)
    : await db.select().from(notices).where(eq(notices.status, "published")).orderBy(desc(notices.createdAt)).limit(100);
  return Response.json({ notices: rows });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  if (!(await adminUser())) return jsonError("Forbidden", 403);
  const input = await readJsonObject(request);
  if (!input) return jsonError("Invalid JSON");
  const kind = trim(input.kind, 30);
  const titleEn = trim(input.titleEn, 180);
  const bodyEn = trim(input.bodyEn, 3000);
  const location = trim(input.location, 200);
  const status = trim(input.status, 20);
  if (!validKinds.includes(kind as typeof validKinds[number]) || !titleEn || !bodyEn || !location || !["draft", "published"].includes(status)) return jsonError("Missing or invalid notice fields");
  const now = new Date().toISOString();
  const notice = {
    id: crypto.randomUUID(), kind, status, titleEn, bodyEn, location,
    titleZh: trim(input.titleZh, 180) || null, titleMs: trim(input.titleMs, 180) || null,
    bodyZh: trim(input.bodyZh, 3000) || null, bodyMs: trim(input.bodyMs, 3000) || null,
    startAt: trim(input.startAt, 40) || null, endAt: trim(input.endAt, 40) || null,
    diversion: trim(input.diversion, 600) || null,
    latitude: trim(input.latitude, 24) || null, longitude: trim(input.longitude, 24) || null,
    createdAt: now, updatedAt: now,
  };
  await getDb().insert(notices).values(notice);
  return Response.json({ notice }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  if (!(await adminUser())) return jsonError("Forbidden", 403);
  const input = await readJsonObject(request);
  if (!input) return jsonError("Invalid JSON");
  const id = trim(input.id, 60);
  const found = await getDb().select().from(notices).where(eq(notices.id, id)).limit(1);
  if (!found.length) return jsonError("Notice not found", 404);
  const kind = trim(input.kind, 30);
  const status = trim(input.status, 20);
  const titleEn = trim(input.titleEn, 180);
  const bodyEn = trim(input.bodyEn, 3000);
  const location = trim(input.location, 200);
  if (!validKinds.includes(kind as typeof validKinds[number]) || !["draft","published","archived"].includes(status) || !titleEn || !bodyEn || !location) return jsonError("Missing or invalid notice fields");
  await getDb().update(notices).set({
    kind, status, titleEn, bodyEn, location,
    titleZh: trim(input.titleZh, 180) || null, titleMs: trim(input.titleMs, 180) || null,
    bodyZh: trim(input.bodyZh, 3000) || null, bodyMs: trim(input.bodyMs, 3000) || null,
    startAt: trim(input.startAt, 40) || null, endAt: trim(input.endAt, 40) || null,
    diversion: trim(input.diversion, 600) || null,
    latitude: trim(input.latitude, 24) || null, longitude: trim(input.longitude, 24) || null,
    updatedAt: new Date().toISOString(),
  }).where(eq(notices.id, id));
  return Response.json({ ok: true });
}
