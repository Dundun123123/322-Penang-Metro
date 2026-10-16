import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { reports } from "@/db/schema";
import { adminUser, jsonError, trim } from "@/lib/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = trim(url.searchParams.get("reference"), 40).toUpperCase();
  const row = await getDb().select().from(reports).where(eq(reports.reference, reference)).limit(1);
  if (!row.length || !row[0].photoKey) return jsonError("Photo not found", 404);
  const user = await getChatGPTUser();
  const allowed = Boolean(await adminUser()) || Boolean(user && row[0].ownerUserId === user.userId);
  if (!allowed) return jsonError("Forbidden", 403);
  const object = await env.BUCKET?.get(row[0].photoKey);
  if (!object) return jsonError("Photo not found", 404);
  return new Response(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType || "image/jpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" } });
}
