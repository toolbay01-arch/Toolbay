import { redirect } from "next/navigation";

import { caller } from "@/trpc/server";

import { SignInView } from "@/modules/auth/ui/views/sign-in-view";

export const dynamic = "force-dynamic";

const Page = async ({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) => {
  const session = await caller.auth.session();
  const params = await searchParams;
  const redirectUrl = params.redirect || "/";

  if (session.user) {
    redirect(redirectUrl);
  }

  return <SignInView />
}
 
export default Page;
