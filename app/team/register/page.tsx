import AuthEntry from "@/components/auth-entry";
import { getLocalUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TeamRegisterPage() {
  const user = await getLocalUser();
  return (
    <AuthEntry
      audience="team"
      signedIn={user?.role === "team"}
      continueHref="/team"
      initialMode="register"
    />
  );
}
