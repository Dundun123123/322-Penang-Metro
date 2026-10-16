import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { reportEvents, reports } from "@/db/schema";
import { adminUser, jsonError, readJsonObject, sameOrigin, trim, validStatuses } from "@/lib/server";

export async function GET() {
  if (!(await adminUser())) return jsonError("Forbidden", 403);
  const rows = await getDb().select().from(reports).orderBy(desc(reports.createdAt)).limit(200);
  const events = await getDb().select().from(reportEvents).orderBy(desc(reportEvents.createdAt)).limit(500);
  return Response.json({ reports: rows.map(({ accessHash, photoKey, ...row }) => ({ ...row, hasPhoto: Boolean(photoKey) })), events });
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  if (!(await adminUser())) return jsonError("Forbidden", 403);
  const input = await readJsonObject(request);
  const reference = trim(input?.reference, 40).toUpperCase();
  const status = trim(input?.status, 30);
  const noteEn = trim(input?.noteEn, 1000);
  const noteZh = trim(input?.noteZh, 1000);
  const noteMs = trim(input?.noteMs, 1000);
  if (!reference || !validStatuses.includes(status as typeof validStatuses[number]) || noteEn.length < 5) return jsonError("Reference, status and an English note of at least 5 characters are required");
  const db = getDb();
  const found = await db.select().from(reports).where(eq(reports.reference, reference)).limit(1);
  if (!found.length) return jsonError("Report not found", 404);
  const currentIndex = validStatuses.indexOf(found[0].status as typeof validStatuses[number]);
  const nextIndex = validStatuses.indexOf(status as typeof validStatuses[number]);
  if (nextIndex < currentIndex) return jsonError("Status cannot move backwards");
  const now = new Date().toISOString();
  await db.update(reports).set({ status, updatedAt: now }).where(eq(reports.id, found[0].id));
  await db.insert(reportEvents).values({ id: crypto.randomUUID(), reportId: found[0].id, status, noteEn, noteZh: noteZh || null, noteMs: noteMs || null, createdAt: now });
  return Response.json({ ok: true, status });
}
