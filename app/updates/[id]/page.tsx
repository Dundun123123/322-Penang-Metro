import { eq, and } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { notices } from "@/db/schema";
import NoticeDetail from "@/components/notice-detail";

export const dynamic = "force-dynamic";

export default async function UpdatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) notFound();
  if (!await getChatGPTUser()) redirect(`/login?next=${encodeURIComponent(`/updates/${id}`)}`);
  const rows = await getDb().select().from(notices)
    .where(and(eq(notices.id, id), eq(notices.status, "published"))).limit(1);
  if (!rows.length) notFound();
  return <NoticeDetail notice={rows[0]} />;
}
