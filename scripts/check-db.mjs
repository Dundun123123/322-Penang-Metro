import nextEnv from "@next/env";
import mysql from "mysql2/promise";
nextEnv.loadEnvConfig(process.cwd());
for (const key of ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"]) {
  if (!process.env[key]) throw new Error(`Missing ${key} in .env.local`);
}
const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 10000,
});
try {
  const [identity] = await db.query(
    "SELECT CURRENT_USER() AS account, DATABASE() AS db, @@max_allowed_packet AS maxPacket",
  );
  console.log(identity[0]);
  const required = {
    users: [
      "id",
      "email",
      "name",
      "password_hash",
      "role",
      "created_at",
      "staff_kind",
      "department",
    ],
    sessions: ["id", "user_id", "expires_at", "created_at"],
    notices: [
      "id",
      "kind",
      "status",
      "title_en",
      "title_zh",
      "title_ms",
      "body_en",
      "body_zh",
      "body_ms",
      "location",
      "start_at",
      "end_at",
      "diversion",
      "latitude",
      "longitude",
      "route_path",
      "progress_percent",
      "point_data",
      "client_request_id",
      "created_at",
      "updated_at",
    ],
    reports: [
      "id",
      "reference",
      "access_hash",
      "owner_user_id",
      "contact_email",
      "kind",
      "location",
      "description",
      "photo_key",
      "photo_type",
      "status",
      "created_at",
      "updated_at",
    ],
    report_events: [
      "id",
      "report_id",
      "status",
      "note_en",
      "note_zh",
      "note_ms",
      "actor_name",
      "actor_role",
      "notice_id",
      "created_at",
    ],
    notice_images: ["id", "notice_id", "storage_key", "mime_type", "created_at"],
    subscriptions: ["user_id", "categories", "updated_at"],
    uploaded_files: ["storage_key", "mime_type", "content", "created_at"],
  };
  for (const [table, columns] of Object.entries(required)) {
    const [actual] = await db.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",
      [table],
    );
    const missing = columns.filter((c) => !actual.some((a) => a.COLUMN_NAME === c));
    if (missing.length) throw new Error(`Missing columns in ${table}: ${missing.join(", ")}`);
    console.log(`${table}: OK`);
  }
  if (Number(identity[0].maxPacket) < 16 * 1024 * 1024)
    throw new Error(
      "Set max_allowed_packet to at least 16 MB on the MySQL server for 5 MB image uploads.",
    );
  console.log("Connection and required columns OK. No data was changed.");
} finally {
  await db.end();
}
