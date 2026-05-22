import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/onboarding/profile-form";

export const metadata: Metadata = {
  title: "Tell us about you",
  description:
    "Quick 60-second setup so StockVision can recommend stocks that match your style, risk tolerance, and market preferences.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ next?: string; force?: string }>;
}

export default async function ProfileOnboardingPage({ searchParams }: PageProps) {
  const { next, force } = await searchParams;
  const { user, profile } = await getCurrentSession();
  if (!user) {
    redirect(`/auth/signin?next=${encodeURIComponent("/onboarding/profile")}`);
  }
  // If already onboarded and ?force isn't set, skip back to dashboard.
  // (Treat onboarded as boolean — a missing column would surface as
  // undefined, in which case we still show the form so the user can
  // configure preferences.)
  if (profile?.onboarded === true && !force) {
    redirect(next ?? "/");
  }

  return (
    <ProfileForm
      initial={profile ?? null}
      defaultName={
        profile?.full_name ??
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        ""
      }
      nextPath={next ?? "/"}
    />
  );
}
