import { authorityUser } from "@/lib/auth";
import { currentTeamCode } from "@/lib/team-code";
import { jsonError } from "@/lib/server";

export const runtime = "nodejs";

export async function GET() {
  if (!(await authorityUser())) return jsonError("Forbidden", 403);
  const current = currentTeamCode();
  if (!current) return jsonError("Configure TEAM_CODE_SECRET on this website", 503);
  return Response.json(current, { headers: { "Cache-Control": "no-store" } });
}
