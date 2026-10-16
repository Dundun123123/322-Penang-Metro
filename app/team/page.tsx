import { redirect } from "next/navigation";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import AdminApp from "@/components/admin-app";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  if (!await getChatGPTUser()) redirect("/team/login");
  return <AdminApp />;
}
