import { redirect } from "next/navigation";
import { teamUser } from "@/lib/auth";
import AdminApp from "@/components/admin-app";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  if (!(await teamUser())) redirect("/team/login");
  return <AdminApp role="team" />;
}
