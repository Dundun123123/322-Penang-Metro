import { getDb } from "@/db";
import { getLocalUser } from "@/lib/auth";
import { adminUser, jsonError, readJsonObject, sameOrigin, trim, validKinds } from "@/lib/server";
import { decodeRoutePath, encodeRoutePath } from "@/lib/route-path";
import { decodeNoticePoints, getTransportStops, hasCoordinates } from "@/lib/notice-features";
import { noticeDates } from "@/lib/notice-dates";
export const runtime = "nodejs";
const fullColumns = `id,kind,status,title_en AS titleEn,title_zh AS titleZh,title_ms AS titleMs,body_en AS bodyEn,body_zh AS bodyZh,body_ms AS bodyMs,location,start_at AS startAt,end_at AS endAt,diversion,latitude,longitude,route_path AS routePath,progress_percent AS progressPercent,point_data AS pointData,gmt_create AS createdAt,gmt_modified AS updatedAt`;
const summaryColumns = `id,kind,status,title_en AS titleEn,title_zh AS titleZh,title_ms AS titleMs,location,start_at AS startAt,end_at AS endAt,progress_percent AS progressPercent,gmt_create AS createdAt`;
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const all = params.get("all") === "1";
  if (all && !(await adminUser())) return jsonError("Forbidden", 403);
  const pageText = params.get("page") || "0";
  if (!/^(0|[1-9]\d{0,5})$/.test(pageText)) return jsonError("Invalid page");
  const page = Number(pageText),
    pageSize = 30;
  const id = trim(params.get("id"), 60);
  const kind = trim(params.get("kind"), 30);
  const search = trim(params.get("q"), 160);
  if (kind && !validKinds.includes(kind as never)) return jsonError("Invalid category");
  const conditions: string[] = all ? [] : ["status='published'"];
  const values: (string | number)[] = [];
  if (id) {
    conditions.push("id=?");
    values.push(id);
  }
  if (kind) {
    conditions.push("kind=?");
    values.push(kind);
  }
  if (search) {
    conditions.push(
      "(LOCATE(LOWER(?),LOWER(CONCAT_WS(' ',location,title_en,title_zh,title_ms)))>0)",
    );
    values.push(search);
  }
  const columns = all || (await getLocalUser()) ? fullColumns : summaryColumns;
  const rows = await getDb()
    .prepare(
      `SELECT ${columns} FROM notice ${conditions.length ? "WHERE " + conditions.join(" AND ") : ""} ORDER BY gmt_create DESC,id DESC LIMIT ? OFFSET ?`,
    )
    .all(...values, pageSize + 1, page * pageSize);
  const typedRows = rows.slice(0, pageSize) as Array<{ id: string }>;
  const images =
    columns === summaryColumns || !typedRows.length
      ? []
      : await getDb()
          .prepare(
            `SELECT id,notice_id FROM notice_image WHERE notice_id IN (${typedRows.map(() => "?").join(",")}) ORDER BY gmt_create`,
          )
          .all(...typedRows.map((notice) => notice.id));
  const notices = typedRows.map((notice) => ({
    ...notice,
    images: images
      .filter((image) => image.notice_id === notice.id)
      .map((image) => ({ id: image.id })),
  }));
  return Response.json({ notices, nextPage: rows.length > pageSize ? page + 1 : null });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  if (!(await adminUser())) return jsonError("Forbidden", 403);
  const x = await readJsonObject(request);
  if (!x) return jsonError("Invalid JSON");
  const dates = noticeDates(x.startAt, x.endAt);
  if ("error" in dates) return jsonError(dates.error);
  const kind = trim(x.kind, 30),
    titleEn = trim(x.titleEn, 180),
    bodyEn = trim(x.bodyEn, 3000),
    location = trim(x.location, 200),
    status = trim(x.status, 20),
    clientRequestId = trim(x.clientRequestId, 60),
    routePath = validRoutePath(x.routePath),
    progressPercent = validProgress(x.progressPercent),
    pointData = validPointData(x.pointData);
  if (
    !validKinds.includes(kind as never) ||
    !titleEn ||
    !bodyEn ||
    !location ||
    !["draft", "published"].includes(status) ||
    (clientRequestId && !/^[a-f0-9-]{36}$/i.test(clientRequestId)) ||
    routePath === undefined ||
    progressPercent === undefined ||
    pointData === undefined
  )
    return jsonError("Missing or invalid notice fields");
  const featureError = validatePublishedFeatures(
    kind,
    status,
    routePath,
    pointData,
    progressPercent,
    dates.endAt,
  );
  if (featureError) return jsonError(featureError);
  if (clientRequestId) {
    const prior = (await getDb()
      .prepare(
        "SELECT id,gmt_create AS createdAt,gmt_modified AS updatedAt FROM notice WHERE client_request_id=?",
      )
      .get(clientRequestId)) as { id: string; createdAt: string; updatedAt: string } | undefined;
    if (prior) return reusedNotice(prior);
  }
  const now = new Date().toISOString(),
    id = crypto.randomUUID();
  try {
    await getDb()
      .prepare(
        `INSERT INTO notice (id,kind,status,title_en,title_zh,title_ms,body_en,body_zh,body_ms,location,start_at,end_at,diversion,latitude,longitude,route_path,progress_percent,point_data,client_request_id,gmt_create,gmt_modified) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        id,
        kind,
        status,
        titleEn,
        trim(x.titleZh, 180) || null,
        trim(x.titleMs, 180) || null,
        bodyEn,
        trim(x.bodyZh, 3000) || null,
        trim(x.bodyMs, 3000) || null,
        location,
        dates.startAt,
        dates.endAt,
        trim(x.diversion, 600) || null,
        trim(x.latitude, 24) || null,
        trim(x.longitude, 24) || null,
        routePath,
        kind === "schedule" ? progressPercent : null,
        kind === "business" || kind === "transport" || kind === "safety" ? pointData : null,
        clientRequestId || null,
        now,
        now,
      );
  } catch (error) {
    const prior = clientRequestId
      ? ((await getDb()
          .prepare(
            "SELECT id,gmt_create AS createdAt,gmt_modified AS updatedAt FROM notice WHERE client_request_id=?",
          )
          .get(clientRequestId)) as
          { id: string; createdAt: string; updatedAt: string } | undefined)
      : undefined;
    if (prior) return reusedNotice(prior);
    throw error;
  }
  return Response.json({ notice: { id, updatedAt: now } }, { status: 201 });
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  if (!(await adminUser())) return jsonError("Forbidden", 403);
  const x = await readJsonObject(request);
  if (!x) return jsonError("Invalid JSON");
  const dates = noticeDates(x.startAt, x.endAt);
  if ("error" in dates) return jsonError(dates.error);
  const id = trim(x.id, 60),
    kind = trim(x.kind, 30),
    status = trim(x.status, 20),
    titleEn = trim(x.titleEn, 180),
    bodyEn = trim(x.bodyEn, 3000),
    location = trim(x.location, 200),
    routePath = validRoutePath(x.routePath),
    progressPercent = validProgress(x.progressPercent),
    pointData = validPointData(x.pointData);
  if (!(await getDb().prepare("SELECT 1 FROM notice WHERE id=?").get(id)))
    return jsonError("Notice not found", 404);
  const expectedUpdatedAt = trim(x.updatedAt, 30);
  if (!expectedUpdatedAt) return jsonError("Reload the saved notice before editing it", 428);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(expectedUpdatedAt) ||
    !Number.isFinite(Date.parse(expectedUpdatedAt))
  )
    return jsonError("Invalid notice version");
  if (
    !validKinds.includes(kind as never) ||
    !["draft", "published", "archived"].includes(status) ||
    !titleEn ||
    !bodyEn ||
    !location ||
    routePath === undefined ||
    progressPercent === undefined ||
    pointData === undefined
  )
    return jsonError("Missing or invalid notice fields");
  const featureError = validatePublishedFeatures(
    kind,
    status,
    routePath,
    pointData,
    progressPercent,
    dates.endAt,
  );
  if (featureError) return jsonError(featureError);
  // Advance even for two saves in the same millisecond or hosts with clock skew.
  const updatedAt = new Date(Math.max(Date.now(), Date.parse(expectedUpdatedAt) + 1)).toISOString();
  const result = await getDb()
    .prepare(
      `UPDATE notice SET kind=?,status=?,title_en=?,title_zh=?,title_ms=?,body_en=?,body_zh=?,body_ms=?,location=?,start_at=?,end_at=?,diversion=?,latitude=?,longitude=?,route_path=?,progress_percent=?,point_data=?,gmt_modified=? WHERE id=? AND gmt_modified=?`,
    )
    .run(
      kind,
      status,
      titleEn,
      trim(x.titleZh, 180) || null,
      trim(x.titleMs, 180) || null,
      bodyEn,
      trim(x.bodyZh, 3000) || null,
      trim(x.bodyMs, 3000) || null,
      location,
      dates.startAt,
      dates.endAt,
      trim(x.diversion, 600) || null,
      trim(x.latitude, 24) || null,
      trim(x.longitude, 24) || null,
      routePath,
      kind === "schedule" ? progressPercent : null,
      kind === "business" || kind === "transport" || kind === "safety" ? pointData : null,
      updatedAt,
      id,
      expectedUpdatedAt,
    );
  if (result.affectedRows !== 1)
    return jsonError(
      "This notice was changed by someone else. Reload the saved version before retrying.",
      409,
    );
  return Response.json({ ok: true, notice: { id, updatedAt } });
}

function reusedNotice(prior: { id: string; createdAt: string; updatedAt: string }) {
  if (prior.createdAt !== prior.updatedAt)
    return jsonError(
      "This notice has already been changed. Open the saved notice to continue.",
      409,
    );
  return Response.json({ notice: { id: prior.id, updatedAt: prior.updatedAt, reused: true } });
}

function validRoutePath(value: unknown) {
  const routes = decodeRoutePath(value);
  if (routes === null) return undefined;
  const encoded = encodeRoutePath(routes);
  return encoded === "[]" ? null : encoded;
}

function validProgress(value: unknown): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100
    ? value
    : undefined;
}

function validPointData(value: unknown): string | null | undefined {
  if (typeof value === "string" && value.length > 12_000) return undefined;
  const points = decodeNoticePoints(value);
  if (points === null) return undefined;
  return Object.keys(points).length ? JSON.stringify(points) : null;
}

function validatePublishedFeatures(
  kind: string,
  status: string,
  routePath: string | null,
  pointData: string | null,
  progressPercent: number | null,
  endAt: unknown,
) {
  if (status !== "published") return "";
  if (
    kind === "schedule" &&
    (progressPercent === null || !trim(endAt, 40) || !Number.isFinite(Date.parse(trim(endAt, 40))))
  )
    return "A published construction plan needs progress and an estimated completion time";
  if (
    (kind === "closure" || kind === "business") &&
    !(decodeRoutePath(routePath) || []).some((branch) => branch.length >= 2)
  )
    return "Draw at least one affected road section with a start and end point";
  if (kind === "business") {
    const points = decodeNoticePoints(pointData);
    if (
      !points ||
      !hasCoordinates(points.original) ||
      !hasCoordinates(points.replacement) ||
      !points.original.name ||
      !points.replacement.name
    )
      return "Select and name both the original and temporary locations on the map";
  }
  if (kind === "transport") {
    const stops = getTransportStops(decodeNoticePoints(pointData) || {});
    if (
      !stops.length ||
      stops.some(
        (pair) =>
          !hasCoordinates(pair.original) ||
          !hasCoordinates(pair.replacement) ||
          !pair.original.name ||
          !pair.replacement.name,
      )
    )
      return "Name and locate both bus stops in every numbered stop change";
  }
  if (kind === "safety" && !hasCoordinates(decodeNoticePoints(pointData)?.hazard))
    return "Select the affected safety location on the map";
  return "";
}
