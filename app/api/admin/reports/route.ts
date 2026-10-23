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
const pageSize = 30;
export async function GET(request: Request) {
  if (!(await adminUser())) return jsonError("Forbidden", 403);
  const params = new URL(request.url).searchParams;
  const pageText = params.get("page") || "0";
  if (!/^(0|[1-9]\d{0,5})$/.test(pageText)) return jsonError("Invalid page");
  const page = Number(pageText);
  const offset = page * pageSize;
  const reference = trim(params.get("reference"), 40).toUpperCase();
  if (reference) {
    const report = getDb().prepare("SELECT id FROM reports WHERE reference=?").get(reference) as
      { id: string } | undefined;
    if (!report) return jsonError("Report not found", 404);
    const rows = getDb()
      .prepare(
        `SELECT e.id,e.report_id AS reportId,e.status,e.note_en AS noteEn,e.note_zh AS noteZh,e.note_ms AS noteMs,e.actor_name AS actorName,e.actor_role AS actorRole,e.notice_id AS noticeId,n.title_en AS noticeTitle,e.created_at AS createdAt FROM report_events e LEFT JOIN notices n ON n.id=e.notice_id AND n.status='published' WHERE e.report_id=? ORDER BY e.created_at DESC,e.id DESC LIMIT ? OFFSET ?`,
      )
      .all(report.id, pageSize + 1, offset);
    return Response.json({
      events: rows.slice(0, pageSize),
      nextPage: rows.length > pageSize ? page + 1 : null,
    });
  }
  const rows = getDb()
    .prepare(
      `SELECT id,reference,kind,location,description,contact_email AS contactEmail,status,created_at AS createdAt,photo_key IS NOT NULL AS hasPhoto FROM reports ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,
    )
    .all(pageSize + 1, offset);
  return Response.json({
    reports: rows.slice(0, pageSize),
    nextPage: rows.length > pageSize ? page + 1 : null,
  });
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  const actor = await adminUser();
  if (!actor) return jsonError("Forbidden", 403);
  const x = await readJsonObject(request);
  const reference = trim(x?.reference, 40).toUpperCase(),
    status = trim(x?.status, 30),
    noteEn = trim(x?.noteEn, 1000),
    noteZh = trim(x?.noteZh, 1000),
    noteMs = trim(x?.noteMs, 1000),
    noticeId = trim(x?.noticeId, 60);
  if (!reference || !validStatuses.includes(status as never) || noteEn.length < 5)
    return jsonError("Reference, status and a response note of at least 5 characters are required");
  const found = getDb()
    .prepare("SELECT id,status FROM reports WHERE reference=?")
    .get(reference) as { id: string; status: string } | undefined;
  if (!found) return jsonError("Report not found", 404);
  if (validStatuses.indexOf(status as never) < validStatuses.indexOf(found.status as never))
    return jsonError("Status cannot move backwards");
  if (noticeId) {
    if (status !== "resolved" && status !== "closed")
      return jsonError("A related notice can only be attached to a resolved or closed report");
    if (!getDb().prepare("SELECT 1 FROM notices WHERE id=? AND status='published'").get(noticeId))
      return jsonError("Select a published notice", 400);
  }
  const now = new Date().toISOString();
  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE reports SET status=?,updated_at=? WHERE id=?").run(status, now, found.id);
    db.prepare(
      "INSERT INTO report_events (id,report_id,status,note_en,note_zh,note_ms,actor_name,actor_role,notice_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    ).run(
      crypto.randomUUID(),
      found.id,
      status,
      noteEn,
      noteZh || null,
      noteMs || null,
      actor.name,
      actor.role,
      noticeId || null,
      now,
    );
  })();
  return Response.json({ ok: true, status });
}
