import { eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { admins } from "@/db/schema";
import { jsonError, readJsonObject, sameOrigin, setupKey, trim } from "@/lib/server";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ signedIn: false, isAdmin: false, needsSetup: false });
  const db = getDb();
  const [mine, any] = await Promise.all([
    db.select().from(admins).where(eq(admins.userId, user.userId)).limit(1),
    db.select().from(admins).limit(1),
  ]);
  return Response.json({ signedIn: true, email: user.email, isAdmin: mine.length > 0, needsSetup: any.length === 0 });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in is required", 401);
  const input = await readJsonObject(request);
  const key = trim(input?.setupKey, 120);
  if (!setupKey() || !key || key !== setupKey()) return jsonError("Setup key is incorrect", 403);
  const db = getDb();
  const existing = await db.select().from(admins).limit(1);
  if (existing.length) return jsonError("The first administrator has already been set up", 409);
  await db.insert(admins).values({ userId: user.userId, email: user.email, createdAt: new Date().toISOString() });
  return Response.json({ isAdmin: true });
}
