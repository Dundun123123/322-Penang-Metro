import { getChatGPTUser, chatGPTSignInPath } from "@/app/chatgpt-auth";
import AuthEntry from "@/components/auth-entry";

export const dynamic = "force-dynamic";

export default async function TeamLoginPage() {
  const user = await getChatGPTUser();
  return <AuthEntry audience="team" signedIn={Boolean(user)} signInHref={chatGPTSignInPath("/team")} continueHref="/team" />;
}
