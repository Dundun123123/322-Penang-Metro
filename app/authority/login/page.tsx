import AuthEntry from "@/components/auth-entry";
import { getLocalUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AuthorityLoginPage() {
  const user = await getLocalUser();
  return (
    <AuthEntry
      audience="authority"
      signedIn={user?.role === "authority"}
      continueHref="/authority"
    />
  );
}
