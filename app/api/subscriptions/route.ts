import { eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { subscriptions } from "@/db/schema";
import { jsonError, readJsonObject, sameOrigin, validKinds } from "@/lib/server";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in is required", 401);
  const rows = await getDb().select().from(subscriptions).where(eq(subscriptions.userId, user.userId)).limit(1);
  return Response.json({ categories: rows.length ? JSON.parse(rows[0].categories) : [] });
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in is required", 401);
  const body = await readJsonObject(request);
  if (!Array.isArray(body?.categories) || body.categories.some((item: unknown) => !validKinds.includes(item as typeof validKinds[number]))) return jsonError("Invalid categories");
  const categories = [...new Set(body.categories as string[])] as string[];
  await getDb().insert(subscriptions).values({
    userId: user.userId, categories: JSON.stringify(categories), updatedAt: new Date().toISOString(),
  }).onConflictDoUpdate({ target: subscriptions.userId, set: { categories: JSON.stringify(categories), updatedAt: new Date().toISOString() } });
  return Response.json({ categories });
}
