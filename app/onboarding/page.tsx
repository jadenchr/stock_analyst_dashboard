import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata = {
  title: "Welcome",
};

interface PageProps {
  searchParams: Promise<{ next?: string; force?: string }>;
}

export default async function OnboardingPage({ searchParams }: PageProps) {
  const { next, force } = await searchParams;
  // If user is already signed in (and didn't pass ?force=1), skip the flow
  if (!force) {
    const user = await getCurrentUser();
    if (user) redirect(next ?? "/");
  }

  return <OnboardingFlow nextPath={next ?? "/"} />;
}
