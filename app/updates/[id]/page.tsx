import { notFound, redirect } from "next/navigation";
import { getLocalUser } from "@/lib/auth";
import { getDb } from "@/db";
import NoticeDetail from "@/components/notice-detail";

export const dynamic = "force-dynamic";

export default async function UpdatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) notFound();
  if (!(await getLocalUser())) redirect(`/login?next=${encodeURIComponent(`/updates/${id}`)}`);
  const row = await getDb()
    .prepare(
      `SELECT id,kind,title_en AS titleEn,title_zh AS titleZh,title_ms AS titleMs,body_en AS bodyEn,body_zh AS bodyZh,body_ms AS bodyMs,location,start_at AS startAt,end_at AS endAt,diversion,latitude,longitude,route_path AS routePath,progress_percent AS progressPercent,point_data AS pointData,created_at AS createdAt FROM notices WHERE id=? AND status='published'`,
    )
    .get(id);
  if (!row) notFound();
  const images = (await getDb()
    .prepare("SELECT id FROM notice_images WHERE notice_id=? ORDER BY created_at")
    .all(id)) as { id: string }[];
  return (
    <NoticeDetail notice={{ ...(row as Parameters<typeof NoticeDetail>[0]["notice"]), images }} />
  );
}
