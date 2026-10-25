import { redirect } from "next/navigation";
import { getLocalUser } from "@/lib/auth";
import AuthEntry from "@/components/auth-entry";

export const dynamic = "force-dynamic";

function safeDestination(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/community";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/community";
    if (url.pathname === "/community" || /^\/updates\/[a-f0-9-]{36}(\/map)?$/.test(url.pathname))
      return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    /* Fall through to the home page. */
  }
  return "/community";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}) {
  const { next, mode } = await searchParams;
  const destination = safeDestination(next);
  if (await getLocalUser()) redirect(destination);
  return (
    <AuthEntry
      audience="community"
      signedIn={false}
      continueHref={destination}
      initialMode={mode === "register" ? "register" : "login"}
    />
  );
}
