import { getCurrentUser } from "@/lib/supabase/server";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { LandingPage } from "@/components/landing/landing-page";

/**
 * Root route — auth-aware:
 *   • Guest visitors get the animated marketing landing.
 *   • Signed-in users land straight on the markets dashboard.
 *
 * The header's UserMenu handles the top-right identity widget in both
 * cases. We resolve the user server-side so there's no flash.
 */
export default async function HomePage() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch {
    // If Supabase is misconfigured locally, default to the landing.
  }
  return user ? <DashboardHome /> : <LandingPage />;
}
