import { redirect } from "next/navigation";
import { getLocalUser } from "@/lib/auth";
import AuthEntry from "@/components/auth-entry";

export const dynamic = "force-dynamic";

function safeDestination(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/";
    if (url.pathname === "/" || /^\/updates\/[a-f0-9-]{36}$/.test(url.pathname))
      return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    /* Fall through to the home page. */
  }
  return "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = safeDestination(next);
  if (await getLocalUser()) redirect(destination);
  return <AuthEntry audience="community" signedIn={false} continueHref={destination} />;
}
