import { getDb } from "@/db";
import { getLocalUser, staffUser } from "@/lib/auth";
import { jsonError, sameOrigin, trim } from "@/lib/server";
import { saveUpload, readUpload, deleteUpload } from "@/lib/uploads";

export const runtime = "nodejs";

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

// GET: 从共享 MySQL 读取公告图片
export async function GET(request: Request) {
  const id = trim(new URL(request.url).searchParams.get("id"), 60);

  const row = (await getDb()
    .prepare(
      "SELECT i.storage_key AS storageKey, i.mime_type AS mimeType, n.status FROM notice_images i JOIN notices n ON n.id=i.notice_id WHERE i.id=?",
    )
    .get(id)) as
    | {
        storageKey: string;
        mimeType: string;
        status: string;
      }
    | undefined;

  if (!row) return jsonError("Image not found", 404);

  const user = await getLocalUser();

  if (!user || (row.status !== "published" && user.role !== "team" && user.role !== "authority"))
    return jsonError("Forbidden", 403);

  const upload = await readUpload(row.storageKey);

  if (!upload) return jsonError("Image not found", 404);

  return new Response(new Uint8Array(upload.content), {
    headers: {
      "Content-Type": row.mimeType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}

// POST: 上传图片到共享 MySQL
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

  if (!upload.size || upload.size > maxBytes) return jsonError("Image must be 5 MB or smaller");

  const bytes = Buffer.from(await upload.arrayBuffer());
  const detected = imageType(bytes);

  if (!detected || upload.type !== detected.mime) return jsonError("Use a JPEG, PNG or WebP image");

  const id = uploadId || crypto.randomUUID();
  const key = `notice-${id}.${detected.ext}`;
  const db = getDb();

  // 使用 MySQL 事务确保图片与公告图片记录一起保存
  const result = await db.transaction(async (tx) => {
    const notice = await tx.prepare("SELECT id FROM notices WHERE id=? FOR UPDATE").get(noticeId);

    if (!notice) return { status: "missing" as const };

    if (uploadId) {
      const prior = (await tx
        .prepare("SELECT notice_id AS noticeId FROM notice_images WHERE id=?")
        .get(uploadId)) as { noticeId: string } | undefined;

      if (prior)
        return {
          status: prior.noticeId === noticeId ? ("existing" as const) : ("conflict" as const),
        };
    }

    const count = (await tx
      .prepare("SELECT COUNT(*) AS total FROM notice_images WHERE notice_id=?")
      .get(noticeId)) as { total: number | string } | undefined;

    if (Number(count?.total ?? 0) >= 4) return { status: "limit" as const };

    await saveUpload(tx, key, detected.mime, bytes);

    await tx
      .prepare(
        "INSERT INTO notice_images (id,notice_id,storage_key,mime_type,created_at) VALUES (?,?,?,?,?)",
      )
      .run(id, noticeId, key, detected.mime, new Date().toISOString());

    return { status: "created" as const };
  });

  if (result.status === "missing") return jsonError("Notice not found", 404);

  if (result.status === "conflict") return jsonError("Upload ID is already in use", 409);

  if (result.status === "limit") return jsonError("Each notice supports up to four images");

  if (result.status === "existing")
    return Response.json({
      image: { id, noticeId },
      alreadyUploaded: true,
    });

  return Response.json({ image: { id, noticeId } }, { status: 201 });
}

// DELETE: 从共享 MySQL 删除公告图片
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);

  if (!(await staffUser())) return jsonError("Forbidden", 403);

  const id = trim(new URL(request.url).searchParams.get("id"), 60);

  const db = getDb();

  const deleted = await db.transaction(async (tx) => {
    const row = (await tx
      .prepare("SELECT storage_key AS storageKey FROM notice_images WHERE id=? FOR UPDATE")
      .get(id)) as { storageKey: string } | undefined;

    if (!row) return false;

    await tx.prepare("DELETE FROM notice_images WHERE id=?").run(id);

    await deleteUpload(tx, row.storageKey);

    return true;
  });

  if (!deleted) return jsonError("Image not found", 404);

  return Response.json({ ok: true });
}
