import CommunityApp from "@/components/community-app";
import { getChatGPTUser } from "@/app/chatgpt-auth";
export const dynamic = "force-dynamic";
export default async function Home() { return <CommunityApp signedIn={Boolean(await getChatGPTUser())} />; }
