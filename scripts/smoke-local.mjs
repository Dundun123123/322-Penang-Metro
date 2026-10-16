// End-to-end check against the local Vinext preview only. Uses the mock Sites user.
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:5173";
const signIn = await fetch(base + "/signin-with-chatgpt?return_to=/", { redirect: "manual" });
const cookie = signIn.headers.get("set-cookie")?.split(";")[0];
if (!cookie) throw new Error("Local mock sign-in did not return a cookie");
async function request(path, options = {}) {
  const response = await fetch(base + path, { ...options, headers: { Cookie: cookie, Origin: base, ...(options.headers || {}) } });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.arrayBuffer();
  if (!response.ok) throw new Error(`${response.status} ${path}: ${JSON.stringify(data)}`);
  return data;
}
const anonymousAdmin = await fetch(base + "/api/admin/reports");
if (anonymousAdmin.status !== 403) throw new Error("Anonymous admin access was not rejected");
let account = await request("/api/admin");
if (account.needsSetup) {
  await request("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ setupKey: "local-test-setup-key" }) });
  account = await request("/api/admin");
}
if (!account.isAdmin) throw new Error("Administrator setup failed");
const stamp = Date.now();
const created = await request("/api/notices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
  kind: "closure", status: "published", titleEn: `QA closure ${stamp}`, titleZh: "测试道路封闭", titleMs: "Penutupan jalan ujian",
  bodyEn: "Local integration test notice.", bodyZh: "本地集成测试公告。", bodyMs: "Makluman ujian tempatan.",
  location: "QA test location", startAt: "2026-10-20T10:00:00.000Z", endAt: "2026-10-20T12:00:00.000Z",
}) });
const publicNotices = await request("/api/notices");
if (!publicNotices.notices.some((item) => item.id === created.notice.id)) throw new Error("Published notice is not visible");
const form = new FormData();
form.set("kind", "safety"); form.set("location", "QA test location"); form.set("description", "A temporary test barrier needs attention.");
form.set("photo", new Blob([new Uint8Array([137,80,78,71,13,10,26,10])], { type: "image/png" }), "test.png");
const submitted = await request("/api/reports", { method: "POST", body: form });
const trackQuery = new URLSearchParams({ reference: submitted.reference, code: submitted.accessCode });
let tracked = await request("/api/reports/track?" + trackQuery);
if (tracked.report.status !== "received" || tracked.events.length !== 1) throw new Error("New report was not persisted");
const wrongCode = await fetch(base + "/api/reports/track?" + new URLSearchParams({ reference: submitted.reference, code: "WRONG" }));
if (wrongCode.status !== 403) throw new Error("A wrong tracking code was accepted");
await request("/api/reports/photo?" + trackQuery);
await request("/api/admin/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
  reference: submitted.reference, status: "reviewing", noteEn: "The project team is checking the site.", noteZh: "项目组正在检查现场。", noteMs: "Pasukan projek sedang menyemak lokasi.",
}) });
tracked = await request("/api/reports/track?" + trackQuery);
if (tracked.report.status !== "reviewing" || tracked.events.length !== 2) throw new Error("Report status did not update");
await request("/api/subscriptions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categories: ["closure", "safety"] }) });
const preferences = await request("/api/subscriptions");
if (preferences.categories.length !== 2) throw new Error("Alert preferences were not saved");
console.log(JSON.stringify({ ok: true, noticeId: created.notice.id, reportReference: submitted.reference, status: tracked.report.status, events: tracked.events.length, subscriptions: preferences.categories }));
