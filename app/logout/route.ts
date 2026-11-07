import { destroySession } from "@/lib/auth";
export const runtime = "nodejs";
export async function GET() {
  await destroySession();
  // Keep the browser's current origin instead of the server's listen address.
  return new Response(null, {
    status: 303,
    headers: { Location: "/", "Cache-Control": "no-store" },
  });
}
