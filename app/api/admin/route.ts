import { getLocalUser, teamExists } from "@/lib/auth";
export const runtime = "nodejs";
export async function GET() {
  const user = await getLocalUser();
  return Response.json({
    signedIn: Boolean(user),
    email: user?.email,
    isAdmin: user?.role === "team" || user?.role === "authority",
    role: user?.role,
    department: user?.department,
    needsSetup: !(await teamExists()),
  });
}
