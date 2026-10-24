import { getDb } from "@/db";
import { getLocalUser } from "@/lib/auth";
import { adminUser, jsonError, readJsonObject, sameOrigin, trim, validKinds } from "@/lib/server";
import { decodeRoutePath, encodeRoutePath } from "@/lib/route-path";
import { decodeNoticePoints, getTransportStops, hasCoordinates } from "@/lib/notice-features";
export const runtime = "nodejs";
const fullColumns = `id,kind,status,title_en AS titleEn,title_zh AS titleZh,title_ms AS titleMs,body_en AS bodyEn,body_zh AS bodyZh,body_ms AS bodyMs,location,start_at AS startAt,end_at AS endAt,diversion,latitude,longitude,route_path AS routePath,progress_percent AS progressPercent,point_data AS pointData,created_at AS createdAt,updated_at AS updatedAt`;
const summaryColumns = `id,kind,status,title_en AS titleEn,title_zh AS titleZh,title_ms AS titleMs,location,start_at AS startAt,end_at AS endAt,progress_percent AS progressPercent,created_at AS createdAt`;
export async function GET(request: Request) {
  const all = new URL(request.url).searchParams.get("all") === "1";
  if (all && !(await adminUser())) return jsonError("Forbidden", 403);
  const columns = all || (await getLocalUser()) ? fullColumns : summaryColumns;
  const rows = await getDb()
    .prepare(
      `SELECT ${columns} FROM notices ${all ? "" : "WHERE status='published'"} ORDER BY created_at DESC LIMIT ?`,
    )
    .all(all ? 200 : 100);
  const typedRows = rows as Array<{ id: string }>;
  const images =
    columns === summaryColumns || !typedRows.length
      ? []
      : await getDb()
          .prepare(
            `SELECT id,notice_id FROM notice_images WHERE notice_id IN (${typedRows.map(() => "?").join(",")}) ORDER BY created_at`,
          )
          .all(...typedRows.map((notice) => notice.id));
  const notices = typedRows.map((notice) => ({
    ...notice,
    images: images
      .filter((image) => image.notice_id === notice.id)
      .map((image) => ({ id: image.id })),
  }));
  return Response.json({ notices });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  if (!(await adminUser())) return jsonError("Forbidden", 403);
  const x = await readJsonObject(request);
  if (!x) return jsonError("Invalid JSON");
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
    x.endAt,
  );
  if (featureError) return jsonError(featureError);
  if (clientRequestId) {
    const prior = (await getDb()
      .prepare("SELECT id FROM notices WHERE client_request_id=?")
      .get(clientRequestId)) as { id: string } | undefined;
    if (prior) return Response.json({ notice: { id: prior.id, reused: true } });
  }
  const now = new Date().toISOString(),
    id = crypto.randomUUID();
  try {
    await getDb()
      .prepare(
        `INSERT INTO notices (id,kind,status,title_en,title_zh,title_ms,body_en,body_zh,body_ms,location,start_at,end_at,diversion,latitude,longitude,route_path,progress_percent,point_data,client_request_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
        trim(x.startAt, 40) || null,
        trim(x.endAt, 40) || null,
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
          .prepare("SELECT id FROM notices WHERE client_request_id=?")
          .get(clientRequestId)) as { id: string } | undefined)
      : undefined;
    if (prior) return Response.json({ notice: { id: prior.id, reused: true } });
    throw error;
  }
  return Response.json({ notice: { id } }, { status: 201 });
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin", 403);
  if (!(await adminUser())) return jsonError("Forbidden", 403);
  const x = await readJsonObject(request);
  if (!x) return jsonError("Invalid JSON");
  const id = trim(x.id, 60),
    kind = trim(x.kind, 30),
    status = trim(x.status, 20),
    titleEn = trim(x.titleEn, 180),
    bodyEn = trim(x.bodyEn, 3000),
    location = trim(x.location, 200),
    routePath = validRoutePath(x.routePath),
    progressPercent = validProgress(x.progressPercent),
    pointData = validPointData(x.pointData);
  if (!(await getDb().prepare("SELECT 1 FROM notices WHERE id=?").get(id)))
    return jsonError("Notice not found", 404);
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
    x.endAt,
  );
  if (featureError) return jsonError(featureError);
  await getDb()
    .prepare(
      `UPDATE notices SET kind=?,status=?,title_en=?,title_zh=?,title_ms=?,body_en=?,body_zh=?,body_ms=?,location=?,start_at=?,end_at=?,diversion=?,latitude=?,longitude=?,route_path=?,progress_percent=?,point_data=?,updated_at=? WHERE id=?`,
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
      trim(x.startAt, 40) || null,
      trim(x.endAt, 40) || null,
      trim(x.diversion, 600) || null,
      trim(x.latitude, 24) || null,
      trim(x.longitude, 24) || null,
      routePath,
      kind === "schedule" ? progressPercent : null,
      kind === "business" || kind === "transport" || kind === "safety" ? pointData : null,
      new Date().toISOString(),
      id,
    );
  return Response.json({ ok: true });
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
