import { PasswordBusyError } from "@/lib/password";
import { getDb } from "@/db";
import { hashPassword, teamUser } from "@/lib/auth";
import { isEmail, jsonError, readJsonObject, sameOrigin, trim } from "@/lib/server";

export const runtime = "nodejs";

export async function GET() {
  if (!(await teamUser())) return jsonError("Forbidden", 403);
  const accounts = await getDb()
    .prepare(
      "SELECT id,email,name,department,gmt_create AS createdAt FROM app_user WHERE role='team' AND staff_kind='authority' ORDER BY gmt_create DESC",
    )
    .all();
  return Response.json({ accounts });
}

export async function POST(request: Request) {
  try {
    return await createAuthority(request);
  } catch (error) {
    if (error instanceof PasswordBusyError)
      return Response.json(
        { error: error.message },
        { status: 503, headers: { "Retry-After": "1" } },
      );
    if (error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY")
      return jsonError("An account with this email already exists", 409);
    throw error;
  }
}
async function createAuthority(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  if (!(await teamUser())) return jsonError("Forbidden", 403);
  const input = await readJsonObject(request);
  if (!input) return jsonError("Invalid request");
  const name = trim(input.name, 120);
  const email = trim(input.email, 250).toLowerCase();
  const password = trim(input.password, 200);
  const department = trim(input.department, 30);
  if (
    name.length < 2 ||
    !email ||
    !isEmail(email) ||
    password.length < 12 ||
    !["transport", "local"].includes(department)
  )
    return jsonError(
      "Name, valid email, department and a password of at least 12 characters are required",
    );
  const db = getDb();
  if (await db.prepare("SELECT 1 FROM app_user WHERE email=?").get(email))
    return jsonError("An account with this email already exists", 409);
  await db
    .prepare(
      "INSERT INTO app_user (id,email,name,password_hash,role,staff_kind,department,gmt_create) VALUES (?,?,?,?,?,?,?,?)",
    )
    .run(
      crypto.randomUUID(),
      email,
      name,
      await hashPassword(password),
      "team",
      "authority",
      department,
      new Date().toISOString(),
    );
  return Response.json({ ok: true }, { status: 201 });
}
