export type NoticePoint = { name: string; lat?: number; lng?: number };
export type StopChange = { original?: NoticePoint; replacement?: NoticePoint };
export const MAX_STOP_CHANGES = 20;
export type NoticePoints = {
  original?: NoticePoint;
  replacement?: NoticePoint;
  hazard?: NoticePoint;
  stops?: StopChange[];
};

function readPoint(value: unknown): NoticePoint | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const name = typeof candidate.name === "string" ? candidate.name.trim().slice(0, 120) : "";
  const lat = candidate.lat;
  const lng = candidate.lng;
  if (lat === undefined && lng === undefined) return { name };
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  )
    return undefined;
  return { name, lat, lng };
}

export function decodeNoticePoints(value: unknown): NoticePoints | null {
  if (value === null || value === undefined || value === "") return {};
  let raw: unknown = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const object = raw as Record<string, unknown>;
  const original = readPoint(object.original);
  const replacement = readPoint(object.replacement);
  const hazard = readPoint(object.hazard);
  if (object.original !== undefined && !original) return null;
  if (object.replacement !== undefined && !replacement) return null;
  if (object.hazard !== undefined && !hazard) return null;
  let stops: StopChange[] | undefined;
  if (object.stops !== undefined) {
    if (!Array.isArray(object.stops) || object.stops.length > MAX_STOP_CHANGES) return null;
    stops = [];
    for (const value of object.stops) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const pair = value as Record<string, unknown>;
      const oldStop = readPoint(pair.original);
      const newStop = readPoint(pair.replacement);
      if (pair.original !== undefined && !oldStop) return null;
      if (pair.replacement !== undefined && !newStop) return null;
      stops.push({
        ...(oldStop ? { original: oldStop } : {}),
        ...(newStop ? { replacement: newStop } : {}),
      });
    }
  }
  return {
    ...(original ? { original } : {}),
    ...(replacement ? { replacement } : {}),
    ...(hazard ? { hazard } : {}),
    ...(stops ? { stops } : {}),
  };
}

export function getTransportStops(points: NoticePoints): StopChange[] {
  if (points.stops) return points.stops;
  return points.original || points.replacement
    ? [{ original: points.original, replacement: points.replacement }]
    : [];
}

export function hasCoordinates(point?: NoticePoint): point is NoticePoint & {
  lat: number;
  lng: number;
} {
  return typeof point?.lat === "number" && typeof point.lng === "number";
}

export function remainingDays(endAt?: string | null, now = Date.now()): number | null {
  if (!endAt) return null;
  const end = new Date(endAt).getTime();
  return Number.isFinite(end) ? Math.ceil((end - now) / 86_400_000) : null;
}
