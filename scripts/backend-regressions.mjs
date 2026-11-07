import assert from "node:assert/strict";
import { createHash, randomUUID, scryptSync } from "node:crypto";
import sharp from "sharp";

export async function runBackendRegressions(ctx) {
  const {
    db,
    base,
    second,
    team,
    resident,
    authority,
    notice,
    noticeId,
    version,
    report,
    stamp,
    password,
  } = ctx;
  const fixtures = [];
  const strangerEmail = "legacy-" + stamp + "@local.test";
  const strangerId = randomUUID();
  async function call(host, route, status, { cookie = "", json, ...options } = {}) {
    const headers = { Origin: host, Cookie: cookie, ...options.headers };
    if (json) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(json);
    }
    const response = await fetch(host + route, { ...options, headers });
    const body = await response.json();
    assert.equal(response.status, status, route + ": " + JSON.stringify(body));
    return { body, headers: response.headers };
  }
  const postNotice = (host, json, status = 400) =>
    call(host, "/api/notices", status, { cookie: team.cookie, method: "POST", json });
  const patch = (host, json, status) =>
    call(host, "/api/notices", status, { cookie: team.cookie, method: "PATCH", json });
  const track = (cookie = "") =>
    call(second, "/api/reports/track", 200, {
      cookie,
      method: "POST",
      json: { reference: report.reference, accessCode: report.accessCode },
    });
  const login = (email, status, host = base) =>
    call(host, "/api/auth", status, {
      method: "POST",
      json: { action: "login", role: "resident", email, password },
    });
  try {
    // Bad dates must never enter storage, including JavaScript's rollover dates.
    for (const bad of [
      "bad-date",
      "2026-02-29",
      "2026-04-31",
      "2026-13-01",
      "2026-10-25T10:00",
      "2026-10-25T25:00:00Z",
      123,
    ]) {
      await postNotice(base, { ...notice, clientRequestId: randomUUID(), startAt: bad });
      await patch(second, { ...notice, id: noticeId, updatedAt: version, endAt: bad }, 400);
    }
    await postNotice(base, {
      ...notice,
      clientRequestId: randomUUID(),
      startAt: "2026-10-26",
      endAt: "2026-10-25",
    });
    await patch(base, { ...notice, id: noticeId }, 428);
    const dates = await patch(
      base,
      {
        ...notice,
        id: noticeId,
        updatedAt: version,
        startAt: "2028-02-29T08:00:00+08:00",
        endAt: "2028-03-01",
      },
      200,
    );
    assert.ok(dates.body.notice.updatedAt > version);
    const stored = await call(second, "/api/notices?all=1&id=" + noticeId, 200, {
      cookie: team.cookie,
    });
    assert.equal(stored.body.notices[0].startAt, "2028-02-29T00:00:00.000Z");
    assert.equal(stored.body.notices[0].endAt, "2028-03-01T00:00:00.000Z");
    await patch(
      second,
      { ...notice, id: noticeId, updatedAt: version, titleEn: "stale overwrite" },
      409,
    );
    await postNotice(second, notice, 409);
    const beforeRace = dates.body.notice.updatedAt;
    const concurrent = await Promise.all(
      [base, second].map(async (host, i) => {
        const response = await fetch(host + "/api/notices", {
          method: "PATCH",
          headers: { Origin: host, Cookie: team.cookie, "Content-Type": "application/json" },
          body: JSON.stringify({
            ...notice,
            id: noticeId,
            updatedAt: beforeRace,
            titleEn: "Winning edit " + i,
          }),
        });
        return { status: response.status, body: await response.json(), title: "Winning edit " + i };
      }),
    );
    assert.deepEqual(
      concurrent.map((r) => r.status).sort(),
      [200, 409],
      "Only one simultaneous editor wins",
    );
    const winner = concurrent.find((r) => r.status === 200);
    const after = await call(base, "/api/notices?all=1&id=" + noticeId, 200, {
      cookie: authority.cookie,
    });
    assert.equal(after.body.notices[0].titleEn, winner.title);
    assert.ok(winner.body.notice.updatedAt > beforeRace);
    // Historical malformed dates must still render safely.
    await db.query("UPDATE notice SET start_at='legacy-invalid-date' WHERE id=?", [noticeId]);
    assert.equal(
      (await fetch(second + "/updates/" + noticeId, { headers: { Cookie: resident.cookie } }))
        .status,
      200,
    );
    await db.query("UPDATE notice SET start_at=NULL WHERE id=?", [noticeId]);

    // Exercise records beyond both previous fixed limits (100 and 200).
    const rows = Array.from({ length: 205 }, (_, i) => {
      const id = randomUUID();
      fixtures.push(id);
      const date = new Date(Date.UTC(2020, 0, 1) + i * 1000).toISOString();
      return [
        id,
        "closure",
        i === 204 ? "draft" : "published",
        "Pagination " + stamp + " " + i,
        "Pagination body",
        "Older " + stamp,
        date,
        date,
      ];
    });
    await db.query(
      "INSERT INTO notice (id,kind,status,title_en,body_en,location,gmt_create,gmt_modified) VALUES ?",
      [rows],
    );
    for (const all of [false, true]) {
      const ids = [];
      let page = 0;
      do {
        const result = await call(
          base,
          "/api/notices?q=" + stamp + (all ? "&all=1" : "") + "&page=" + page,
          200,
          { cookie: all ? team.cookie : "" },
        );
        ids.push(...result.body.notices.map((n) => n.id));
        page = result.body.nextPage;
      } while (page !== null);
      assert.equal(new Set(ids).size, ids.length, "Pages must not repeat records");
      assert.equal(ids.length, all ? 205 : 204);
      assert.ok(ids.includes(fixtures[0]), "The oldest notice is reachable");
    }
    assert.equal(
      (await call(base, "/api/notices?kind=safety&q=" + stamp, 200)).body.notices.length,
      0,
    );
    await call(base, "/api/notices?page=-1", 400);
    await call(base, "/api/notices?all=1", 403);
    assert.equal(
      (await call(base, "/api/notices?id=" + fixtures[204], 200)).body.notices.length,
      0,
    );
    const old = await call(second, "/api/notices?all=1&id=" + fixtures[0], 200, {
      cookie: team.cookie,
    });
    await patch(
      second,
      {
        ...notice,
        id: fixtures[0],
        updatedAt: old.body.notices[0].updatedAt,
        titleEn: "Edited oldest notice",
      },
      200,
    );

    // Malformed uploads must not create report rows or stored blobs.
    const imageForm = (bytes, mime, forNotice) => {
      const form = new FormData();
      if (forNotice) {
        form.set("noticeId", noticeId);
        form.set("uploadId", randomUUID());
      } else {
        form.set("kind", "safety");
        form.set("location", "QA location");
        form.set("description", "A test report with a validated photo.");
        form.set("contactEmail", strangerEmail);
      }
      form.set(forNotice ? "image" : "photo", new Blob([bytes], { type: mime }), "image.bin");
      return form;
    };
    const invalidImages = [
      [Buffer.from("this is not an image"), "image/png"],
      [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"],
      [Buffer.from([255, 216, 255]), "image/jpeg"],
      [
        await sharp({ create: { width: 1, height: 1, channels: 3, background: "white" } })
          .png()
          .toBuffer(),
        "image/jpeg",
      ],
      [
        await sharp({ create: { width: 4096, height: 4096, channels: 3, background: "white" } })
          .png()
          .toBuffer(),
        "image/png",
      ],
    ];
    const [beforeFiles] = await db.query("SELECT COUNT(*) AS n FROM uploaded_file");
    const [beforeReports] = await db.query("SELECT COUNT(*) AS n FROM report");
    for (const forNotice of [false, true]) {
      const route = forNotice ? "/api/notices/images" : "/api/reports";
      const cookie = forNotice ? team.cookie : resident.cookie;
      for (const [bytes, mime] of invalidImages)
        await call(base, route, 400, {
          cookie,
          method: "POST",
          body: imageForm(bytes, mime, forNotice),
        });
      // No Content-Length: the reader must enforce its own cap on streamed data.
      const wire = new Request(base + route, {
        method: "POST",
        body: imageForm(Buffer.alloc(5 * 1024 * 1024 + 110_000), "image/png", forNotice),
      });
      await call(second, route, 413, {
        cookie,
        method: "POST",
        headers: { "Content-Type": wire.headers.get("content-type") },
        body: wire.body,
        duplex: "half",
      });
    }
    const [afterFiles] = await db.query("SELECT COUNT(*) AS n FROM uploaded_file");
    const [afterReports] = await db.query("SELECT COUNT(*) AS n FROM report");
    assert.equal(afterFiles[0].n, beforeFiles[0].n);
    assert.equal(afterReports[0].n, beforeReports[0].n);
    const gif = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } })
      .gif()
      .toBuffer();
    await call(base, "/api/notices/images", 400, {
      cookie: team.cookie,
      method: "POST",
      body: imageForm(gif, "image/gif", true),
    });
    const gifReport = await call(second, "/api/reports", 201, {
      cookie: resident.cookie,
      method: "POST",
      body: imageForm(gif, "image/gif", false),
    });
    const gifResponse = await fetch(
      base + "/api/reports/photo?reference=" + gifReport.body.reference,
      { headers: { Cookie: resident.cookie } },
    );
    assert.equal(gifResponse.status, 200);
    assert.deepEqual(Buffer.from(await gifResponse.arrayBuffer()), gif);

    // Password hashes created by the old synchronous implementation remain usable.
    const salt = "0123456789abcdef0123456789abcdef";
    await db.query(
      "INSERT INTO app_user (id,email,name,password_hash,role,gmt_create) VALUES (?,?,?,?,?,?)",
      [
        strangerId,
        strangerEmail,
        "Legacy account",
        salt + ":" + scryptSync(password, salt, 64).toString("hex"),
        "resident",
        new Date().toISOString(),
      ],
    );
    const legacy = await login(strangerEmail, 200);
    const strangerCookie = legacy.headers.get("set-cookie").split(";")[0];
    // MySQL's accent-insensitive email collation must not bypass the account limit.
    const alias = strangerEmail.replace("legacy", "l\u00e9gacy");
    for (let i = 0; i < 9; i++)
      await login(i % 2 ? alias : strangerEmail.toUpperCase(), 200, i % 2 ? base : second);
    await login(alias, 429, second);
    assert.equal((await track()).body.report.canViewPhoto, false);
    assert.equal((await track(strangerCookie)).body.report.canViewPhoto, false);
    for (const cookie of [resident.cookie, team.cookie, authority.cookie])
      assert.equal((await track(cookie)).body.report.canViewPhoto, true);
    for (const cookie of ["", strangerCookie])
      assert.equal(
        (
          await fetch(base + "/api/reports/photo?reference=" + report.reference, {
            headers: { Cookie: cookie },
          })
        ).status,
        403,
      );

    // A fresh bucket is contested across both processes; no lost increments or lock errors.
    const limitedEmail = "limited-" + stamp + "@local.test";
    const attempts = await Promise.all(
      Array.from({ length: 14 }, async (_, i) => {
        const host = i % 2 ? base : second;
        const response = await fetch(host + "/api/auth", {
          method: "POST",
          headers: { Origin: host, "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "login",
            role: "resident",
            email: limitedEmail,
            password,
          }),
        });
        if (response.status === 429) assert.ok(Number(response.headers.get("retry-after")) > 0);
        await response.arrayBuffer();
        return response.status;
      }),
    );
    assert.equal(attempts.filter((s) => s === 401).length, 10);
    assert.equal(attempts.filter((s) => s === 429).length, 4);
    const bucket = createHash("sha256")
      .update("login:email:" + limitedEmail)
      .digest("hex");
    await db.query(
      "UPDATE auth_rate_limit SET expires_at=UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000-1 WHERE bucket_key=?",
      [bucket],
    );
    await login(limitedEmail, 401, second);
    for (let i = 0; i < 5; i++)
      await call(i % 2 ? base : second, "/api/auth", 403, {
        method: "POST",
        json: {
          action: "register-team",
          name: "Invalid setup",
          email: "setup-" + stamp + "@local.test",
          password,
          teamCode: "wrong",
        },
      });
    await call(base, "/api/auth", 429, {
      method: "POST",
      json: {
        action: "register-team",
        name: "Invalid setup",
        email: "setup-" + stamp + "@local.test",
        password,
        teamCode: "wrong",
      },
    });
    async function withBucket(key, attempts, window, work) {
      const hash = createHash("sha256").update(key).digest("hex");
      const [previous] = await db.query("SELECT * FROM auth_rate_limit WHERE bucket_key=?", [hash]);
      await db.query(
        "INSERT INTO auth_rate_limit (bucket_key,attempt_count,expires_at) VALUES (?,?,UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000+?) ON DUPLICATE KEY UPDATE attempt_count=VALUES(attempt_count),expires_at=VALUES(expires_at)",
        [hash, attempts, window],
      );
      try {
        await work();
      } finally {
        if (previous[0])
          await db.query(
            "UPDATE auth_rate_limit SET attempt_count=?,expires_at=? WHERE bucket_key=?",
            [previous[0].attempt_count, previous[0].expires_at, hash],
          );
        else await db.query("DELETE FROM auth_rate_limit WHERE bucket_key=?", [hash]);
      }
    }
    // Failed passwords count too; already registered identities have a separate registration quota.
    await withBucket("login:user:" + strangerId, 0, 900_000, async () => {
      for (let i = 0; i < 10; i++)
        await call(i % 2 ? base : second, "/api/auth", 401, {
          method: "POST",
          json: {
            action: "login",
            role: "resident",
            email: strangerEmail,
            password: "WrongPassword!2026",
          },
        });
      await login(strangerEmail, 429, second);
    });
    await withBucket("register:user:" + strangerId, 4, 900_000, async () => {
      await call(base, "/api/auth", 409, {
        method: "POST",
        json: { action: "register", email: strangerEmail, name: "Duplicate", password },
      });
      await call(second, "/api/auth", 429, {
        method: "POST",
        json: { action: "register", email: strangerEmail, name: "Duplicate", password },
      });
    });
    await withBucket("register:global", 19, 3_600_000, async () => {
      await call(base, "/api/auth", 409, {
        method: "POST",
        json: { action: "register", email: strangerEmail, name: "Duplicate", password },
      });
      const deniedEmail = "denied-" + stamp + "@local.test";
      await call(second, "/api/auth", 429, {
        method: "POST",
        json: { action: "register", email: deniedEmail, name: "New user", password },
      });
      const [unexpected] = await db.query("SELECT * FROM auth_rate_limit WHERE bucket_key=?", [
        createHash("sha256")
          .update("register:email:" + deniedEmail)
          .digest("hex"),
      ]);
      assert.equal(unexpected.length, 0, "Global denial must not create account buckets");
    });
    await withBucket("auth-global", 119, 60_000, async () => {
      await login(strangerEmail, 429); // Account blocked, but still consumes the global attempt.
      await login("globally-denied-" + stamp + "@local.test", 429, second);
      const [global] = await db.query(
        "SELECT attempt_count FROM auth_rate_limit WHERE bucket_key=?",
        [createHash("sha256").update("auth-global").digest("hex")],
      );
      assert.equal(Number(global[0].attempt_count), 120);
      await call(base, "/api/auth", 200, {
        cookie: strangerCookie,
        method: "POST",
        json: { action: "logout" },
      });
      assert.equal(
        (await call(second, "/api/auth", 200, { cookie: strangerCookie })).body.user,
        null,
      );
    });
    console.log(
      "PASS: date validation, stale/simultaneous edits, pagination beyond 200, full image validation, streamed upload limits, photo authorization, legacy passwords and cross-instance throttling.",
    );
  } finally {
    if (fixtures.length) await db.query("DELETE FROM notice WHERE id IN (?)", [fixtures]);
    await db.query("DELETE FROM app_user WHERE email=?", [strangerEmail]);
    for (const key of [
      "login:email:limited-" + stamp + "@local.test",
      "login:user:" + strangerId,
      "register-team:email:setup-" + stamp + "@local.test",
    ])
      await db.query("DELETE FROM auth_rate_limit WHERE bucket_key=?", [
        createHash("sha256").update(key).digest("hex"),
      ]);
  }
}
