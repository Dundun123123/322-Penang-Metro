import { getDb } from "@/db";
import {
  adminUser,
  jsonError,
  readJsonObject,
  sameOrigin,
  trim,
  validStatuses,
} from "@/lib/server";
export const runtime = "nodejs";
export async function GET() {
  if (!(await adminUser())) return jsonError("Forbidden", 403);
  const reports = getDb()
    .prepare(
      `SELECT id,reference,kind,location,description,contact_email AS contactEmail,status,created_at AS createdAt,photo_key IS NOT NULL AS hasPhoto FROM reports ORDER BY created_at DESC LIMIT 200`,
    )
    .all();
  const events = getDb()
    .prepare(
      `SELECT id,report_id AS reportId,status,note_en AS noteEn,note_zh AS noteZh,note_ms AS noteMs,created_at AS createdAt FROM report_events ORDER BY created_at DESC LIMIT 500`,
    )
    .all();
  return Response.json({ reports, events });
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  if (!(await adminUser())) return jsonError("Forbidden", 403);
  const x = await readJsonObject(request);
  const reference = trim(x?.reference, 40).toUpperCase(),
    status = trim(x?.status, 30),
    noteEn = trim(x?.noteEn, 1000),
    noteZh = trim(x?.noteZh, 1000),
    noteMs = trim(x?.noteMs, 1000);
  if (!reference || !validStatuses.includes(status as never) || noteEn.length < 5)
    return jsonError("Reference, status and an English note of at least 5 characters are required");
  const found = getDb()
    .prepare("SELECT id,status FROM reports WHERE reference=?")
    .get(reference) as { id: string; status: string } | undefined;
  if (!found) return jsonError("Report not found", 404);
  if (validStatuses.indexOf(status as never) < validStatuses.indexOf(found.status as never))
    return jsonError("Status cannot move backwards");
  const now = new Date().toISOString();
  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE reports SET status=?,updated_at=? WHERE id=?").run(status, now, found.id);
    db.prepare(
      "INSERT INTO report_events (id,report_id,status,note_en,note_zh,note_ms,created_at) VALUES (?,?,?,?,?,?,?)",
    ).run(crypto.randomUUID(), found.id, status, noteEn, noteZh || null, noteMs || null, now);
  })();
  return Response.json({ ok: true, status });
}
