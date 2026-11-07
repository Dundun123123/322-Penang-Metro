import "server-only";
import { createHash } from "node:crypto";
import { getDb } from "@/db";

// Shared counters and database time apply across all website instances.
export async function consumeAuthAttempt(action: string, identity: string) {
  const policies = [{ key: "auth-global", limit: 120, window: 60_000 }];
  if (action !== "login")
    policies.push({ key: action + ":global", limit: 20, window: 60 * 60_000 });
  policies.push({
    key: action + ":" + identity,
    limit: action === "login" ? 10 : 5,
    window: 15 * 60_000,
  });
  const db = getDb();
  await db
    .prepare(
      "DELETE FROM auth_rate_limit WHERE expires_at < UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000 - 86400000 LIMIT 100",
    )
    .run();
  return db.transaction(async (tx) => {
    const clock = await tx.prepare("SELECT UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000 AS now").get();
    const now = Number(clock?.now);
    if (!Number.isFinite(now)) throw new Error("Authentication clock is unavailable");
    // Lock global buckets first. Rejected account attempts still consume global capacity.
    for (const policy of policies) {
      const key = createHash("sha256").update(policy.key).digest("hex");
      await tx
        .prepare(
          "INSERT INTO auth_rate_limit (bucket_key,attempt_count,expires_at) VALUES (?,0,?) ON DUPLICATE KEY UPDATE bucket_key=bucket_key",
        )
        .run(key, now + policy.window);
      const row = await tx
        .prepare(
          "SELECT attempt_count AS attempts,expires_at AS expires FROM auth_rate_limit WHERE bucket_key=? FOR UPDATE",
        )
        .get(key);
      if (!row) throw new Error("Authentication quota could not be loaded");
      const expired = Number(row.expires) <= now;
      const attempts = expired ? 0 : Number(row.attempts);
      const expires = expired ? now + policy.window : Number(row.expires);
      if (attempts >= policy.limit)
        return { allowed: false, retryAfter: Math.max(1, Math.ceil((expires - now) / 1000)) };
      await tx
        .prepare("UPDATE auth_rate_limit SET attempt_count=?,expires_at=? WHERE bucket_key=?")
        .run(attempts + 1, expires, key);
    }
    return { allowed: true, retryAfter: 0 };
  });
}
