import { redirect } from "next/navigation";
import { authorityUser } from "@/lib/auth";
import AdminApp from "@/components/admin-app";

export const dynamic = "force-dynamic";

export default async function AuthorityPage() {
  if (!(await authorityUser())) redirect("/authority/login");
  return <AdminApp role="authority" />;
}
