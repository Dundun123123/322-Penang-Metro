import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import mysql from "mysql2/promise";
nextEnv.loadEnvConfig(process.cwd());
if (process.env.SMOKE_ALLOW_WRITES !== "1" || !/test/i.test(process.env.DB_NAME || ""))
  throw new Error(
    "Use an isolated DB_NAME containing test and set SMOKE_ALLOW_WRITES=1. Never run against the shared project database.",
  );
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:5173";
const second = process.env.SMOKE_SECOND_BASE_URL || "http://127.0.0.1:5174";
assert.notEqual(base, second, "Start two website instances connected to the same test database");
const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
const stamp = randomUUID();
const residentEmail = `resident-${stamp}@local.test`,
  teamEmail = `team-${stamp}@local.test`,
  authorityEmail = `authority-${stamp}@local.test`;
const password = "SharedTest!2026";
let noticeId = "",
  reportReference = "",
  uploadId = "";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=",
  "base64",
);
async function request(host, route, { cookie = "", json, ...options } = {}) {
  const headers = { Origin: host, ...options.headers };
  if (cookie) headers.Cookie = cookie;
  if (json) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(json);
  }
  const response = await fetch(host + route, { ...options, headers, redirect: "manual" });
  const body = await response.json();
  assert.ok(response.ok, `${response.status} ${route}: ${JSON.stringify(body)}`);
  return { body, cookie: response.headers.get("set-cookie")?.split(";")[0] || cookie };
}
async function checkImage(host, route, cookie) {
  const r = await fetch(host + route, { headers: { Cookie: cookie } });
  assert.equal(r.status, 200);
  assert.deepEqual(Buffer.from(await r.arrayBuffer()), png);
}
try {
  // Require a fresh isolated database; both website processes must use these test credentials.
  const [existing] = await db.query("SELECT COUNT(*) AS count FROM app_user WHERE role='team'");
  assert.equal(Number(existing[0].count), 0, "Use a fresh test database with no team accounts");
  const team = await request(base, "/api/auth", {
    method: "POST",
    json: {
      action: "setup-team",
      name: "QA Team",
      email: teamEmail,
      password,
      setupKey: process.env.LOCAL_SETUP_KEY,
    },
  });
  const [teamRows] = await db.query("SELECT id FROM app_user WHERE email=?", [teamEmail]);
  assert.equal(teamRows.length, 1, "First website must point to this test database");
  const resident = await request(second, "/api/auth", {
    method: "POST",
    json: { action: "register", name: "共享测试居民", email: residentEmail, password },
  });
  const [resRows] = await db.query("SELECT id FROM app_user WHERE email=?", [residentEmail]);
  assert.equal(resRows.length, 1, "Second website must point to this test database");
  const login = await request(base, "/api/auth", {
    method: "POST",
    json: { action: "login", role: "resident", email: residentEmail, password },
  });
  assert.equal(
    (await request(second, "/api/auth", { cookie: login.cookie })).body.user.name,
    "共享测试居民",
  );
  await request(base, "/api/admin/authorities", {
    cookie: team.cookie,
    method: "POST",
    json: { name: "QA Authority", email: authorityEmail, password, department: "transport" },
  });
  const authority = await request(second, "/api/auth", {
    method: "POST",
    json: { action: "login", role: "authority", email: authorityEmail, password },
  });
  const notice = {
    kind: "closure",
    status: "published",
    titleEn: `QA ${stamp}`,
    titleZh: "跨电脑共享公告",
    bodyEn: "Shared MySQL notice.",
    location: "QA location",
    routePath: JSON.stringify([
      [
        [5.4, 100.3],
        [5.41, 100.31],
      ],
    ]),
    clientRequestId: randomUUID(),
  };
  const created = await request(base, "/api/notices", {
    cookie: team.cookie,
    method: "POST",
    json: notice,
  });
  noticeId = created.body.notice.id;
  assert.equal(
    (
      await request(second, "/api/notices", {
        cookie: authority.cookie,
        method: "POST",
        json: notice,
      })
    ).body.notice.id,
    noticeId,
    "Idempotent notice creation across instances",
  );
  assert.ok(
    (await request(second, "/api/notices", { cookie: resident.cookie })).body.notices.some(
      (n) => n.id === noticeId,
    ),
  );
  const guest = (await request(second, "/api/notices")).body.notices.find((n) => n.id === noticeId);
  assert.equal(guest.bodyEn, undefined, "Guest gets only a summary");
  const imageForm = new FormData();
  uploadId = randomUUID();
  imageForm.set("noticeId", noticeId);
  imageForm.set("uploadId", uploadId);
  imageForm.set("image", new Blob([png], { type: "image/png" }), "test.png");
  await request(base, "/api/notices/images", {
    cookie: team.cookie,
    method: "POST",
    body: imageForm,
  });
  await checkImage(second, `/api/notices/images?id=${uploadId}`, resident.cookie);
  assert.equal(
    (
      await request(second, "/api/notices/images", {
        cookie: authority.cookie,
        method: "POST",
        body: imageForm,
      })
    ).body.alreadyUploaded,
    true,
  );
  assert.equal((await fetch(second + `/api/notices/images?id=${uploadId}`)).status, 403);
  const form = new FormData();
  form.set("kind", "safety");
  form.set("location", "QA shared location");
  form.set("description", "A report created on the second website instance.");
  form.set("photo", new Blob([png], { type: "image/png" }), "report.png");
  const report = await request(second, "/api/reports", {
    cookie: resident.cookie,
    method: "POST",
    body: form,
  });
  reportReference = report.body.reference;
  await checkImage(base, `/api/reports/photo?reference=${reportReference}`, team.cookie);
  await request(base, "/api/admin/reports", {
    cookie: team.cookie,
    method: "PATCH",
    json: {
      reference: reportReference,
      status: "resolved",
      noteEn: "Resolved on another computer.",
      noticeId,
    },
  });
  const tracked = await request(second, "/api/reports/track", {
    cookie: resident.cookie,
    method: "POST",
    json: { reference: reportReference },
  });
  assert.equal(tracked.body.report.status, "resolved");
  assert.equal(tracked.body.events.length, 2);
  assert.equal(tracked.body.events[1].noticeId, noticeId);
  for (const categories of [["closure"], ["safety", "transport"]])
    await request(base, "/api/subscriptions", {
      cookie: login.cookie,
      method: "PUT",
      json: { categories },
    });
  assert.deepEqual(
    (await request(second, "/api/subscriptions", { cookie: resident.cookie })).body.categories,
    ["safety", "transport"],
  );
  assert.equal(
    (await fetch(second + `/updates/${noticeId}`, { headers: { Cookie: resident.cookie } })).status,
    200,
  );
  assert.equal(
    (await fetch(second + `/updates/${noticeId}/map`, { headers: { Cookie: resident.cookie } }))
      .status,
    200,
  );
  await request(second, `/api/notices/images?id=${uploadId}`, {
    cookie: authority.cookie,
    method: "DELETE",
  });
  assert.equal(
    (
      await fetch(base + `/api/notices/images?id=${uploadId}`, {
        headers: { Cookie: resident.cookie },
      })
    ).status,
    404,
  );
  console.log(
    "PASS: two instances share accounts, sessions, roles, notices, idempotency, images, reports, events, subscriptions and detail pages.",
  );
} finally {
  // Delete only this run's UUID-labelled records.
  const [reports] = await db.query(
    "SELECT id,photo_key FROM report WHERE owner_user_id IN (SELECT id FROM app_user WHERE email=?)",
    [residentEmail],
  );
  for (const row of reports) {
    await db.query("DELETE FROM report WHERE id=?", [row.id]);
    if (row.photo_key)
      await db.query("DELETE FROM uploaded_file WHERE storage_key=?", [row.photo_key]);
  }
  if (noticeId) {
    const [images] = await db.query("SELECT storage_key FROM notice_image WHERE notice_id=?", [
      noticeId,
    ]);
    await db.query("DELETE FROM notice WHERE id=?", [noticeId]);
    for (const image of images)
      await db.query("DELETE FROM uploaded_file WHERE storage_key=?", [image.storage_key]);
  }
  await db.query("DELETE FROM app_user WHERE email IN (?,?,?)", [
    residentEmail,
    teamEmail,
    authorityEmail,
  ]);
  await db.end();
}
