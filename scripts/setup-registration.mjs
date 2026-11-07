import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import nextEnv from "@next/env";
import mysql from "mysql2/promise";

// Run once on the deployment administrator's computer after the SQL migration.
// Environment secrets are bootstrap inputs only; websites read the shared row.
nextEnv.loadEnvConfig(process.cwd());
for (const name of ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"]) {
  if (!process.env[name]) throw new Error(`Missing ${name} in .env.local`);
}
const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectTimeout: 10000,
});
try {
  const [existing] = await db.query("SELECT id FROM registration_config WHERE id=1");
  if (existing.length) {
    console.log("Shared registration is already configured. Existing settings were preserved.");
  } else {
    const authorityKey = process.env.AUTHORITY_REGISTRATION_KEY;
    if (
      !authorityKey ||
      authorityKey.length < 12 ||
      authorityKey.length > 200 ||
      authorityKey !== authorityKey.trim()
    )
      throw new Error(
        "Set AUTHORITY_REGISTRATION_KEY to 12-200 characters without surrounding whitespace on the setup computer.",
      );
    const teamSeed =
      process.env.TEAM_CODE_SECRET ||
      process.env.LOCAL_SETUP_KEY ||
      randomBytes(32).toString("hex");
    if (teamSeed.length > 255)
      throw new Error("Team registration secret must be 255 characters or fewer.");
    const salt = randomBytes(16).toString("hex");
    const digest = await promisify(scrypt)(authorityKey, salt, 64);
    const authorityHash = salt + ":" + digest.toString("hex");
    const now = new Date().toISOString();
    await db.execute(
      "INSERT INTO registration_config (id,authority_key_hash,team_code_secret,gmt_create,gmt_modified) VALUES (1,?,?,?,?) ON DUPLICATE KEY UPDATE id=id",
      [authorityHash, teamSeed, now, now],
    );
    console.log(
      "Shared registration settings are ready. No registration code or secret was printed.",
    );
  }
} catch (error) {
  if (error?.code === "ER_NO_SUCH_TABLE")
    throw new Error(
      "Ask the database administrator to run db/mysql/003-shared-registration.sql in the project database first.",
    );
  throw error;
} finally {
  await db.end();
}
