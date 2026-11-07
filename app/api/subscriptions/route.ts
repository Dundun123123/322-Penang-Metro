import { getDb } from "@/db";
import { getLocalUser } from "@/lib/auth";
import { jsonError, readJsonObject, sameOrigin, validKinds } from "@/lib/server";
export const runtime = "nodejs";
export async function GET() {
  const user = await getLocalUser();
  if (!user) return jsonError("Sign in is required", 401);
  const row = (await getDb()
    .prepare("SELECT categories FROM notice_subscription WHERE user_id=?")
    .get(user.id)) as { categories: string } | undefined;
  return Response.json({ categories: row ? JSON.parse(row.categories) : [] });
}
export async function PUT(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  const user = await getLocalUser();
  if (!user) return jsonError("Sign in is required", 401);
  const body = await readJsonObject(request);
  if (
    !Array.isArray(body?.categories) ||
    body.categories.some((x) => !validKinds.includes(x as never))
  )
    return jsonError("Invalid categories");
  const categories = JSON.stringify([...new Set(body.categories as string[])]);
  await getDb()
    .prepare(
      `INSERT INTO notice_subscription (user_id,categories,gmt_modified) VALUES (?,?,?) AS incoming ON DUPLICATE KEY UPDATE categories=incoming.categories,gmt_modified=incoming.gmt_modified`,
    )
    .run(user.id, categories, new Date().toISOString());
  return Response.json({ categories: JSON.parse(categories) });
}
