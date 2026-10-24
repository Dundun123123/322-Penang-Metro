import "server-only";
import { getDb } from "@/db";

export type AppDatabase = ReturnType<typeof getDb>;
export async function saveUpload(db: AppDatabase, key: string, mime: string, bytes: Buffer) {
  await db
    .prepare(
      "INSERT INTO uploaded_files (storage_key,mime_type,content,created_at) VALUES (?,?,?,?)",
    )
    .run(key, mime, bytes, new Date().toISOString());
}
export async function readUpload(key: string) {
  return (await getDb()
    .prepare("SELECT content FROM uploaded_files WHERE storage_key=?")
    .get(key)) as { content: Buffer } | undefined;
}
export async function deleteUpload(db: AppDatabase, key: string) {
  await db.prepare("DELETE FROM uploaded_files WHERE storage_key=?").run(key);
}
