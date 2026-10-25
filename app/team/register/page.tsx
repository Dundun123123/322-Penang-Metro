import AuthEntry from "@/components/auth-entry";
import StaffRegistration from "@/components/staff-registration";
import { getLocalUser, teamExists } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TeamRegisterPage() {
  if (await teamExists()) return <StaffRegistration audience="team" />;
  const user = await getLocalUser();
  return (
    <AuthEntry
      audience="team"
      signedIn={user?.role === "team"}
      continueHref="/team"
      teamSetupAvailable
    />
  );
}
