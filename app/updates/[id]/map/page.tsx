import { notFound, redirect } from "next/navigation";
import { getLocalUser } from "@/lib/auth";
import { getDb } from "@/db";
import { decodeRoutePath } from "@/lib/route-path";
import FullConstructionMap from "@/components/full-construction-map";

export const dynamic = "force-dynamic";

export default async function FullMapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) notFound();
  if (!await getLocalUser()) redirect(`/login?next=${encodeURIComponent(`/updates/${id}/map`)}`);
  const notice = getDb().prepare("SELECT id, title_en AS titleEn, location, route_path AS routePath FROM notices WHERE id=? AND status='published'").get(id) as
    { id: string; titleEn: string; location: string; routePath: string | null } | undefined;
  if (!notice) notFound();
  const routes = (decodeRoutePath(notice.routePath) || []).filter((branch) => branch.length > 0);
  if (!routes.length) notFound();
  return <FullConstructionMap id={notice.id} title={notice.titleEn} location={notice.location} routes={routes} />;
}
