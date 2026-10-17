import { getDb } from "@/db";
import { getLocalUser } from "@/lib/auth";
import { jsonError, readJsonObject, sameOrigin, sha256, trim } from "@/lib/server";

export const runtime = "nodejs";

type ReportRow = {
  id: string;
  reference: string;
  accessHash: string;
  ownerUserId: string | null;
  kind: string;
  location: string;
  description: string;
  photoKey: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  const input = await readJsonObject(request);
  const reference = trim(input?.reference, 40).toUpperCase();
  const accessCode = trim(input?.accessCode, 40).toUpperCase();
  if (!reference) return jsonError("Reference is required");

  const row = getDb().prepare(`SELECT id,reference,access_hash AS accessHash,owner_user_id AS ownerUserId,kind,location,description,photo_key AS photoKey,status,created_at AS createdAt,updated_at AS updatedAt FROM reports WHERE reference=?`).get(reference) as ReportRow | undefined;
  if (!row) return jsonError("Report not found", 404);

  const user = await getLocalUser();
  const owns = Boolean(user && row.ownerUserId === user.id);
  if (!owns && (!accessCode || await sha256(accessCode) !== row.accessHash)) return jsonError("Reference or access code is incorrect", 403);

  const events = getDb().prepare(`SELECT id,status,note_en AS noteEn,note_zh AS noteZh,note_ms AS noteMs,created_at AS createdAt FROM report_events WHERE report_id=? ORDER BY created_at`).all(row.id);
  const report = {
    id: row.id, reference: row.reference, kind: row.kind, location: row.location,
    description: row.description, status: row.status, createdAt: row.createdAt,
    updatedAt: row.updatedAt, hasPhoto: Boolean(row.photoKey),
  };
  return Response.json({ report, events }, { headers: { "Cache-Control": "private, no-store" } });
}
