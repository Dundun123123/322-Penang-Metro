import {
  createSession,
  destroySession,
  getLocalUser,
  hashPassword,
  teamExists,
  verifyPassword,
} from "@/lib/auth";
import { getDb } from "@/db";
import { isEmail, jsonError, readJsonObject, sameOrigin, trim } from "@/lib/server";

export const runtime = "nodejs";

export async function GET() {
  const user = await getLocalUser();
  return Response.json({
    user: user ? { email: user.email, name: user.name, role: user.role } : null,
    teamSetupAvailable: !(await teamExists()),
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  const input = await readJsonObject(request);
  if (!input) return jsonError("Invalid request");
  const action = trim(input.action, 30);
  if (action === "logout") {
    await destroySession();
    return Response.json({ ok: true });
  }
  const email = trim(input.email, 250).toLowerCase();
  const password = trim(input.password, 200);
  if (!isEmail(email) || !email || password.length < 8)
    return jsonError("Enter a valid email and a password of at least 8 characters");
  const db = getDb();
  if (action === "register") {
    const name = trim(input.name, 120);
    if (name.length < 2) return jsonError("Enter your name");
    if (await db.prepare("SELECT 1 FROM users WHERE email=?").get(email))
      return jsonError("An account with this email already exists", 409);
    const id = crypto.randomUUID();
    await db
      .prepare(
        "INSERT INTO users (id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)",
      )
      .run(id, email, name, hashPassword(password), "resident", new Date().toISOString());
    await createSession(id);
    return Response.json({ ok: true, role: "resident" }, { status: 201 });
  }
  if (action === "setup-team") {
    const setupKey = trim(input.setupKey, 200);
    if (!process.env.LOCAL_SETUP_KEY || setupKey !== process.env.LOCAL_SETUP_KEY)
      return jsonError("The local setup key is incorrect", 403);
    const name = trim(input.name, 120);
    if (name.length < 2) return jsonError("Enter the team member name");
    const id = crypto.randomUUID();
    const error = await db.withLock("metro-first-team", async (db) => {
      if (
        await db
          .prepare(
            "SELECT 1 FROM users WHERE role='team' AND COALESCE(staff_kind,'team')='team' LIMIT 1",
          )
          .get()
      )
        return "The first team account has already been created";
      if (await db.prepare("SELECT 1 FROM users WHERE email=?").get(email))
        return "An account with this email already exists";
      await db
        .prepare(
          "INSERT INTO users (id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)",
        )
        .run(id, email, name, hashPassword(password), "team", new Date().toISOString());
      return null;
    });
    if (error) return jsonError(error, 409);
    await createSession(id);
    return Response.json({ ok: true, role: "team" }, { status: 201 });
  }
  if (action === "login") {
    const expectedRole = trim(input.role, 20);
    const row = (await db
      .prepare(
        "SELECT id,email,name,password_hash AS passwordHash,role,staff_kind AS staffKind FROM users WHERE email=?",
      )
      .get(email)) as
      | {
          id: string;
          email: string;
          name: string;
          passwordHash: string;
          role: string;
          staffKind: string | null;
        }
      | undefined;
    if (!row || !verifyPassword(password, row.passwordHash))
      return jsonError("Email or password is incorrect", 401);
    const actualRole =
      row.role === "team" && row.staffKind === "authority" ? "authority" : row.role;
    if (!["resident", "team", "authority"].includes(expectedRole))
      return jsonError("Choose a valid login portal", 400);
    if (expectedRole === "team" && actualRole !== "team")
      return jsonError("This account does not have construction team access", 403);
    if (expectedRole === "authority" && actualRole !== "authority")
      return jsonError("This account does not have authority workspace access", 403);
    if (expectedRole === "resident" && actualRole !== "resident")
      return jsonError("Use the staff login for this account", 403);
    await createSession(row.id);
    return Response.json({ ok: true, role: actualRole });
  }
  return jsonError("Unknown authentication action");
}
