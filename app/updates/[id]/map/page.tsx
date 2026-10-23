import { notFound, redirect } from "next/navigation";
import { getLocalUser } from "@/lib/auth";
import { getDb } from "@/db";
import { decodeRoutePath } from "@/lib/route-path";
import { decodeNoticePoints, getTransportStops, hasCoordinates } from "@/lib/notice-features";
import FullConstructionMap from "@/components/full-construction-map";

export const dynamic = "force-dynamic";

export default async function FullMapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) notFound();
  if (!(await getLocalUser())) redirect(`/login?next=${encodeURIComponent(`/updates/${id}/map`)}`);
  const notice = getDb()
    .prepare(
      "SELECT id, kind, title_en AS titleEn, location, route_path AS routePath, point_data AS pointData FROM notices WHERE id=? AND status='published'",
    )
    .get(id) as
    | {
        id: string;
        kind: string;
        titleEn: string;
        location: string;
        routePath: string | null;
        pointData: string | null;
      }
    | undefined;
  if (!notice) notFound();
  const routes = (decodeRoutePath(notice.routePath) || []).filter((branch) => branch.length > 0);
  const points = decodeNoticePoints(notice.pointData) || {};
  if (
    !routes.length &&
    !hasCoordinates(points.original) &&
    !hasCoordinates(points.replacement) &&
    !hasCoordinates(points.hazard) &&
    !getTransportStops(points).some(
      (pair) => hasCoordinates(pair.original) || hasCoordinates(pair.replacement),
    )
  )
    notFound();
  return (
    <FullConstructionMap
      id={notice.id}
      title={notice.titleEn}
      location={notice.location}
      routes={routes}
      points={points}
      kind={notice.kind}
    />
  );
}
