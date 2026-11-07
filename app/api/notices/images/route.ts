import { ImageUploadError, readImageForm, validateImageUpload } from "@/lib/image-upload";
import type { ValidatedImage } from "@/lib/image-upload";
import { getDb } from "@/db";
import { getLocalUser, staffUser } from "@/lib/auth";
import { jsonError, sameOrigin, trim } from "@/lib/server";
import { saveUpload, readUpload, deleteUpload } from "@/lib/uploads";

export const runtime = "nodejs";

// GET: 从共享 MySQL 读取公告图片
export async function GET(request: Request) {
  const id = trim(new URL(request.url).searchParams.get("id"), 60);

  const row = (await getDb()
    .prepare(
      "SELECT i.storage_key AS storageKey, i.mime_type AS mimeType, n.status FROM notice_image i JOIN notice n ON n.id=i.notice_id WHERE i.id=?",
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

  let form: FormData;
  try {
    form = await readImageForm(request);
  } catch (error) {
    if (error instanceof ImageUploadError) return jsonError(error.message, error.status);
    throw error;
  }

  const noticeId = trim(form.get("noticeId"), 60);
  const uploadId = trim(form.get("uploadId"), 60);
  const upload = form.get("image");

  if (!noticeId || !(upload instanceof File)) return jsonError("Notice and image are required");

  if (uploadId && !/^[a-f0-9-]{36}$/i.test(uploadId)) return jsonError("Invalid upload ID");

  let detected: ValidatedImage;
  try {
    detected = await validateImageUpload(upload);
  } catch (error) {
    if (error instanceof ImageUploadError) return jsonError(error.message, error.status);
    throw error;
  }
  const { bytes } = detected;

  const id = uploadId || crypto.randomUUID();
  const key = `notice-${id}.${detected.ext}`;
  const db = getDb();

  // 使用 MySQL 事务确保图片与公告图片记录一起保存
  const result = await db.transaction(async (tx) => {
    const notice = await tx.prepare("SELECT id FROM notice WHERE id=? FOR UPDATE").get(noticeId);

    if (!notice) return { status: "missing" as const };

    if (uploadId) {
      const prior = (await tx
        .prepare("SELECT notice_id AS noticeId FROM notice_image WHERE id=?")
        .get(uploadId)) as { noticeId: string } | undefined;

      if (prior)
        return {
          status: prior.noticeId === noticeId ? ("existing" as const) : ("conflict" as const),
        };
    }

    const count = (await tx
      .prepare("SELECT COUNT(*) AS total FROM notice_image WHERE notice_id=?")
      .get(noticeId)) as { total: number | string } | undefined;

    if (Number(count?.total ?? 0) >= 4) return { status: "limit" as const };

    await saveUpload(tx, key, detected.mime, bytes);

    await tx
      .prepare(
        "INSERT INTO notice_image (id,notice_id,storage_key,mime_type,gmt_create) VALUES (?,?,?,?,?)",
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
      .prepare("SELECT storage_key AS storageKey FROM notice_image WHERE id=? FOR UPDATE")
      .get(id)) as { storageKey: string } | undefined;

    if (!row) return false;

    await tx.prepare("DELETE FROM notice_image WHERE id=?").run(id);

    await deleteUpload(tx, row.storageKey);

    return true;
  });

  if (!deleted) return jsonError("Image not found", 404);

  return Response.json({ ok: true });
}
