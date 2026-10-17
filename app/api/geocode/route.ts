import { adminUser, jsonError, trim } from "@/lib/server";

export const runtime = "nodejs";

type NominatimResult = { display_name?: string; lat?: string; lon?: string; type?: string };

export async function GET(request: Request) {
  if (!(await adminUser())) return jsonError("Forbidden", 403);
  const query = trim(new URL(request.url).searchParams.get("q"), 160);
  if (query.length < 3) return jsonError("Enter at least three characters");
  const params = new URLSearchParams({
    q: `${query}, Penang, Malaysia`, format: "jsonv2", limit: "6", countrycodes: "my",
    viewbox: "100.05,5.55,100.55,5.15", bounded: "0", addressdetails: "0",
  });
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "Mutiara-Line-Community-Desk/0.1 (local student project)", "Accept-Language": "en,ms,zh" },
      cache: "no-store",
    });
    if (!response.ok) return jsonError("Map search is temporarily unavailable", 502);
    const raw = await response.json() as NominatimResult[];
    const results = raw.flatMap((item) => {
      const lat = Number(item.lat), lng = Number(item.lon);
      return item.display_name && Number.isFinite(lat) && Number.isFinite(lng) ? [{ name: item.display_name, lat, lng, type: item.type || "place" }] : [];
    });
    return Response.json({ results }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return jsonError("Map search is temporarily unavailable", 502); }
}
