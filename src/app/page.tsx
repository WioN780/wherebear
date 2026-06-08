import { auth } from "@/auth";
import HomeClient from "@/features/home/components/HomeClient";

// Force dynamic rendering since we are checking user sessions (via headers/cookies)
export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  return <HomeClient session={session} />;
}
