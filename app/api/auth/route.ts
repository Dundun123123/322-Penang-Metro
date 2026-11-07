import { consumeAuthAttempt } from "@/lib/auth-rate-limit";
import { PasswordBusyError } from "@/lib/password";
import {
  createSession,
  destroySession,
  getLocalUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { getDb } from "@/db";
import { isEmail, jsonError, readJsonObject, sameOrigin, trim } from "@/lib/server";
import { currentTeamCode, validTeamCode } from "@/lib/team-code";

export const runtime = "nodejs";

export async function GET() {
  const user = await getLocalUser();
  return Response.json({
    user: user ? { email: user.email, name: user.name, role: user.role } : null,
  });
}

export async function POST(request: Request) {
  try {
    return await authenticate(request);
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
async function authenticate(request: Request) {
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
  if (!["login", "register", "setup-team"].includes(action))
    return jsonError("Unknown authentication action");
  const db = getDb();
  const row = (await db
    .prepare(
      "SELECT id,email,name,password_hash AS passwordHash,role,staff_kind AS staffKind FROM app_user WHERE email=?",
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
  const quota = await consumeAuthAttempt(action, row ? "user:" + row.id : "email:" + email);
  if (!quota.allowed)
    return Response.json(
      { error: "Too many attempts. Please wait before trying again." },
      {
        status: 429,
        headers: { "Retry-After": String(quota.retryAfter), "Cache-Control": "no-store" },
      },
    );
  if (action === "register") {
    const name = trim(input.name, 120);
    if (name.length < 2) return jsonError("Enter your name");
    if (row) return jsonError("An account with this email already exists", 409);
    const id = crypto.randomUUID();
    await db
      .prepare(
        "INSERT INTO app_user (id,email,name,password_hash,role,gmt_create) VALUES (?,?,?,?,?,?)",
      )
      .run(id, email, name, await hashPassword(password), "resident", new Date().toISOString());
    await createSession(id);
    return Response.json({ ok: true, role: "resident" }, { status: 201 });
  }
  if (action === "register-authority") {
    const name = trim(input.name, 120);
    const departmentCode = trim(input.department, 40);
    const registrationKey = trim(input.registrationKey, 200);
    const expectedKey = "123456";
    if (name.length < 2) return jsonError("Enter the authority writer name");
    if (!(["transport", "local"] as string[]).includes(departmentCode))
      return jsonError("Choose a valid authority organisation");
    if (password.length < 12)
      return jsonError("Authority account passwords must contain at least 12 characters");
    if (registrationKey !== expectedKey)
      return jsonError("The authority registration code is incorrect", 403);
    const id = crypto.randomUUID();
    const error = await db.withLock("metro-authority-registration", async (lockedDb) => {
      if (await lockedDb.prepare("SELECT 1 FROM app_user WHERE email=?").get(email))
        return "An account with this email already exists";
      await lockedDb
        .prepare(
          "INSERT INTO users (id,email,name,password_hash,role,staff_kind,department,created_at) VALUES (?,?,?,?,?,?,?,?)",
        )
        .run(
          id,
          email,
          name,
          hashPassword(password),
          "team",
          "authority",
          departmentCode,
          new Date().toISOString(),
        );
      return null;
    });
    if (error) return jsonError(error, 409);
    await createSession(id);
    return Response.json({ ok: true, role: "authority" }, { status: 201 });
  }
  if (action === "register-team") {
    const teamCode = trim(input.teamCode, 6);
    if (!currentTeamCode()) return jsonError("Team registration is not configured", 503);
    if (!validTeamCode(teamCode)) return jsonError("The team registration code is incorrect", 403);
    const name = trim(input.name, 120);
    if (name.length < 2) return jsonError("Enter the team member name");
    const id = crypto.randomUUID();
    const error = await db.withLock("metro-team-registration", async (db) => {
      if (await db.prepare("SELECT 1 FROM app_user WHERE email=?").get(email))
        return "An account with this email already exists";
      await db
        .prepare(
          "INSERT INTO app_user (id,email,name,password_hash,role,gmt_create) VALUES (?,?,?,?,?,?)",
        )
        .run(id, email, name, await hashPassword(password), "team", new Date().toISOString());
      return null;
    });
    if (error) return jsonError(error, 409);
    await createSession(id);
    return Response.json({ ok: true, role: "team" }, { status: 201 });
  }
  if (action === "login") {
    const expectedRole = trim(input.role, 20);
    if (!row || !(await verifyPassword(password, row.passwordHash)))
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
