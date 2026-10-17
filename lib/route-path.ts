export type RoutePoint = [number, number];
export type ConstructionRoutes = RoutePoint[][];

const MAX_BRANCHES = 12;
const MAX_POINTS = 200;

function isRoutePoint(value: unknown): value is RoutePoint {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((part) => typeof part === "number" && Number.isFinite(part)) &&
    Math.abs(value[0]) <= 90 &&
    Math.abs(value[1]) <= 180
  );
}

// Older notices stored one route as [[lat, lng], ...]. New notices store
// independent branches as [[[lat, lng], ...], ...].
export function decodeRoutePath(value: unknown): ConstructionRoutes | null {
  if (value === null || value === undefined || value === "") return [];
  if (typeof value === "string" && value.length > 20_000) return null;
  let parsed: unknown;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  if (parsed.length === 0) return [];
  const branches: unknown[] = isRoutePoint(parsed[0]) ? [parsed] : parsed;
  if (branches.length > MAX_BRANCHES) return null;
  let total = 0;
  const routes: ConstructionRoutes = [];
  for (const branch of branches) {
    if (!Array.isArray(branch)) return null;
    total += branch.length;
    if (total > MAX_POINTS || !branch.every(isRoutePoint)) return null;
    routes.push(branch.map((point) => [point[0], point[1]]));
  }
  return routes;
}

export function encodeRoutePath(routes: ConstructionRoutes): string {
  return JSON.stringify(routes.filter((branch) => branch.length > 0));
}
