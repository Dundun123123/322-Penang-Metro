import CommunityApp from "@/components/community-app";
import { getLocalUser } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function Home() {
  return <CommunityApp signedIn={Boolean(await getLocalUser())} />;
}
