import { eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { reportEvents, reports } from "@/db/schema";
import { jsonError, sha256, trim } from "@/lib/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = trim(url.searchParams.get("reference"), 40).toUpperCase();
  const accessCode = trim(url.searchParams.get("code"), 40).toUpperCase();
  if (!reference) return jsonError("Reference is required");
  const row = await getDb().select().from(reports).where(eq(reports.reference, reference)).limit(1);
  if (!row.length) return jsonError("Report not found", 404);
  const user = await getChatGPTUser();
  const ownsReport = Boolean(user && row[0].ownerUserId === user.userId);
  if (!ownsReport && (!accessCode || await sha256(accessCode) !== row[0].accessHash)) return jsonError("Reference or access code is incorrect", 403);
  const events = await getDb().select().from(reportEvents).where(eq(reportEvents.reportId, row[0].id));
  const { accessHash, photoKey, ownerUserId, contactEmail, ...safeReport } = row[0];
  return Response.json({ report: { ...safeReport, hasPhoto: Boolean(photoKey) }, events }, { headers: { "Cache-Control": "private, no-store" } });
}
