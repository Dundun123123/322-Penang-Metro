import fs from "node:fs";
import path from "node:path";
import { getDb, localDataDirectory } from "@/db";
import { getLocalUser, staffUser } from "@/lib/auth";
import { jsonError, sameOrigin, trim } from "@/lib/server";

export const runtime = "nodejs";
const uploadDir = path.join(localDataDirectory, "uploads");
const maxBytes = 5 * 1024 * 1024;

function imageType(bytes: Buffer) {
  if (bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
    return { mime: "image/jpeg", ext: "jpg" };
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { mime: "image/png", ext: "png" };
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return { mime: "image/webp", ext: "webp" };
  return null;
}

export async function GET(request: Request) {
  const id = trim(new URL(request.url).searchParams.get("id"), 60);
  const row = getDb()
    .prepare(
      "SELECT i.storage_key AS storageKey,i.mime_type AS mimeType,n.status FROM notice_images i JOIN notices n ON n.id=i.notice_id WHERE i.id=?",
    )
    .get(id) as { storageKey: string; mimeType: string; status: string } | undefined;
  if (!row) return jsonError("Image not found", 404);
  const user = await getLocalUser();
  if (!user || (row.status !== "published" && user.role !== "team" && user.role !== "authority"))
    return jsonError("Forbidden", 403);
  const filename = path.join(uploadDir, path.basename(row.storageKey));
  if (!fs.existsSync(filename)) return jsonError("Image not found", 404);
  return new Response(fs.readFileSync(filename), {
    headers: {
      "Content-Type": row.mimeType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  if (!(await staffUser())) return jsonError("Forbidden", 403);
  if (Number(request.headers.get("content-length") || 0) > maxBytes + 100_000)
    return jsonError("Image must be 5 MB or smaller", 413);
  const form = await request.formData().catch(() => null);
  const noticeId = trim(form?.get("noticeId"), 60);
  const uploadId = trim(form?.get("uploadId"), 60);
  const upload = form?.get("image");
  if (!noticeId || !(upload instanceof File)) return jsonError("Notice and image are required");
  if (uploadId && !/^[a-f0-9-]{36}$/i.test(uploadId)) return jsonError("Invalid upload ID");
  const db = getDb();
  if (!db.prepare("SELECT 1 FROM notices WHERE id=?").get(noticeId))
    return jsonError("Notice not found", 404);
  if (uploadId) {
    const prior = db
      .prepare("SELECT notice_id AS noticeId FROM notice_images WHERE id=?")
      .get(uploadId) as { noticeId: string } | undefined;
    if (prior)
      return prior.noticeId === noticeId
        ? Response.json({ image: { id: uploadId, noticeId }, alreadyUploaded: true })
        : jsonError("Upload ID is already in use", 409);
  }
  const count = db
    .prepare("SELECT COUNT(*) AS total FROM notice_images WHERE notice_id=?")
    .get(noticeId) as { total: number };
  if (count.total >= 4) return jsonError("Each notice supports up to four images");
  if (!upload.size || upload.size > maxBytes) return jsonError("Image must be 5 MB or smaller");
  const bytes = Buffer.from(await upload.arrayBuffer());
  const detected = imageType(bytes);
  if (!detected || upload.type !== detected.mime) return jsonError("Use a JPEG, PNG or WebP image");
  const id = uploadId || crypto.randomUUID();
  const key = `notice-${id}.${detected.ext}`;
  fs.mkdirSync(uploadDir, { recursive: true });
  const filename = path.join(uploadDir, key);
  fs.writeFileSync(filename, bytes, { flag: "wx" });
  try {
    db.prepare(
      "INSERT INTO notice_images (id,notice_id,storage_key,mime_type,created_at) VALUES (?,?,?,?,?)",
    ).run(id, noticeId, key, detected.mime, new Date().toISOString());
  } catch (error) {
    fs.unlinkSync(filename);
    throw error;
  }
  return Response.json({ image: { id, noticeId } }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  if (!(await staffUser())) return jsonError("Forbidden", 403);
  const id = trim(new URL(request.url).searchParams.get("id"), 60);
  const row = getDb()
    .prepare("SELECT storage_key AS storageKey FROM notice_images WHERE id=?")
    .get(id) as { storageKey: string } | undefined;
  if (!row) return jsonError("Image not found", 404);
  getDb().prepare("DELETE FROM notice_images WHERE id=?").run(id);
  const filename = path.join(uploadDir, path.basename(row.storageKey));
  if (fs.existsSync(filename)) fs.unlinkSync(filename);
  return Response.json({ ok: true });
}
