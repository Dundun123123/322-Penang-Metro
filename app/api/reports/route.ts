import { ImageUploadError, readImageForm, validateImageUpload } from "@/lib/image-upload";
import type { ValidatedImage } from "@/lib/image-upload";
import { saveUpload } from "@/lib/uploads";
import { getDb } from "@/db";
import { getLocalUser } from "@/lib/auth";
import { isEmail, jsonError, randomHex, sameOrigin, sha256, trim } from "@/lib/server";
export const runtime = "nodejs";
const issueKinds = ["safety", "access", "closure", "transport", "noise", "business", "other"];
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  const user = await getLocalUser();
  if (!user) return jsonError("Sign in is required", 401);
  let form: FormData;
  try {
    form = await readImageForm(request);
  } catch (error) {
    if (error instanceof ImageUploadError) return jsonError(error.message, error.status);
    throw error;
  }
  const kind = trim(form.get("kind"), 30),
    location = trim(form.get("location"), 200),
    description = trim(form.get("description"), 3000),
    contactEmail = trim(form.get("contactEmail"), 250);
  if (
    !issueKinds.includes(kind) ||
    location.length < 4 ||
    description.length < 15 ||
    !isEmail(contactEmail)
  )
    return jsonError("Please provide a valid issue type, location and description");
  const file = form.get("photo");
  if (file !== null && !(file instanceof File)) return jsonError("Invalid photo");
  let photo: ValidatedImage | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      photo = await validateImageUpload(file, true);
    } catch (error) {
      if (error instanceof ImageUploadError) return jsonError(error.message, error.status);
      throw error;
    }
  }
  const id = crypto.randomUUID(),
    reference = `ML-${new Date().getFullYear()}-${randomHex(5).toUpperCase()}`,
    accessCode = randomHex(12).toUpperCase(),
    accessHash = await sha256(accessCode);
  const photoKey = photo ? `${id}.${photo.ext}` : null,
    photoType = photo?.mime ?? null,
    photoBytes = photo?.bytes ?? null;
  const now = new Date().toISOString(),
    db = getDb();
  await db.transaction(async (db) => {
    if (photoKey && photoType && photoBytes) await saveUpload(db, photoKey, photoType, photoBytes);
    await db
      .prepare(
        `INSERT INTO report (id,reference,access_hash,owner_user_id,contact_email,kind,location,description,photo_key,photo_type,status,gmt_create,gmt_modified) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        id,
        reference,
        accessHash,
        user.id,
        contactEmail || user.email,
        kind,
        location,
        description,
        photoKey,
        photoType,
        "received",
        now,
        now,
      );
    await db
      .prepare(
        `INSERT INTO report_event (id,report_id,status,note_en,note_zh,note_ms,gmt_create) VALUES (?,?,?,?,?,?,?)`,
      )
      .run(
        crypto.randomUUID(),
        id,
        "received",
        "Report received and awaiting review.",
        "报告已收到，等待项目组审核。",
        "Laporan diterima dan menunggu semakan pasukan projek.",
        now,
      );
  });
  return Response.json({ reference, accessCode, status: "received" }, { status: 201 });
}
export async function GET() {
  const user = await getLocalUser();
  if (!user) return jsonError("Sign in is required", 401);
  const rows = await getDb()
    .prepare(
      `SELECT reference,kind,location,status,gmt_create AS createdAt FROM report WHERE owner_user_id=? ORDER BY gmt_create DESC LIMIT 100`,
    )
    .all(user.id);
  return Response.json({ reports: rows });
}
