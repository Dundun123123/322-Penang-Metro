import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function penangDate(now: Date) {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function currentTeamCode(now = new Date()) {
  const secret = process.env.TEAM_CODE_SECRET || process.env.LOCAL_SETUP_KEY;
  if (!secret) return null;
  const date = penangDate(now);
  const digest = createHmac("sha256", secret).update(`team-registration:${date}`).digest();
  const code = (digest.readUInt32BE(0) % 1_000_000).toString().padStart(6, "0");
  return { date, code };
}

export function validTeamCode(value: string, now = new Date()) {
  const current = currentTeamCode(now);
  if (!current || !/^\d{6}$/.test(value)) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(current.code));
}
