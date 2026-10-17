import { getLocalUser, teamExists } from "@/lib/auth";
import AuthEntry from "@/components/auth-entry";

export const dynamic = "force-dynamic";

export default async function TeamLoginPage() {
  const user = await getLocalUser();
  return <AuthEntry audience="team" signedIn={user?.role === "team"} continueHref="/team" teamSetupAvailable={!teamExists()} />;
}
