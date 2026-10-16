import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { reportEvents, reports } from "@/db/schema";
import { isEmail, jsonError, randomHex, sameOrigin, sha256, trim } from "@/lib/server";

const issueKinds = ["safety", "access", "closure", "transport", "noise", "business", "other"];

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in is required", 401);
  const form = await request.formData().catch(() => null);
  if (!form) return jsonError("Invalid form");
  const kind = trim(form.get("kind"), 30);
  const location = trim(form.get("location"), 200);
  const description = trim(form.get("description"), 3000);
  const contactEmail = trim(form.get("contactEmail"), 250);
  if (!issueKinds.includes(kind) || location.length < 4 || description.length < 15 || !isEmail(contactEmail)) return jsonError("Please provide a valid issue type, location and description");
  const file = form.get("photo");
  if (file instanceof File && file.size > 0 && (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 5_000_000)) return jsonError("Photo must be a JPG, PNG, WebP or GIF under 5 MB");
  const id = crypto.randomUUID();
  const reference = `ML-${new Date().getFullYear()}-${randomHex(5).toUpperCase()}`;
  const accessCode = randomHex(12).toUpperCase();
  let photoKey: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!env.BUCKET) return jsonError("Photo storage is unavailable", 503);
    photoKey = `reports/${id}/photo`;
    await env.BUCKET.put(photoKey, file.stream(), { httpMetadata: { contentType: file.type } });
  }
  const now = new Date().toISOString();
  const db = getDb();
  await db.insert(reports).values({
    id, reference, accessHash: await sha256(accessCode), ownerUserId: user.userId,
    contactEmail: contactEmail || user.email, kind, location, description, photoKey,
    status: "received", createdAt: now, updatedAt: now,
  });
  await db.insert(reportEvents).values({
    id: crypto.randomUUID(), reportId: id, status: "received",
    noteEn: "Report received and awaiting review.",
    noteZh: "报告已收到，等待项目组审核。",
    noteMs: "Laporan diterima dan menunggu semakan pasukan projek.",
    createdAt: now,
  });
  return Response.json({ reference, accessCode, status: "received" }, { status: 201 });
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in is required", 401);
  const rows = await getDb().select({
    reference: reports.reference, kind: reports.kind, location: reports.location,
    status: reports.status, createdAt: reports.createdAt,
  }).from(reports).where(eq(reports.ownerUserId, user.userId)).limit(100);
  return Response.json({ reports: rows });
}
