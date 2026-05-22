import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Supabase OAuth callback target.
 *
 * Flow:
 *   1. User clicks "Sign in with Google" on /auth/signin
 *   2. Supabase JS redirects to Google's consent screen
 *   3. Google redirects back to https://<supabase-project>/auth/v1/callback
 *   4. Supabase exchanges the code, then redirects HERE with ?code=...
 *   5. We exchange that code for a session cookie.
 *   6. If the user's profile hasn't been completed (onboarded=false),
 *      we redirect to /onboarding/profile?next=... to collect their
 *      preferences for the AI picks feature.
 *   7. Otherwise we send them to ?next=... (or / by default).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Best-effort: check whether the user has completed the profile form.
      // The on-signup trigger seeds the row with onboarded=false, so a
      // first-time visitor lands on the profile form before the dashboard.
      //
      // CRITICAL: if the profile fetch errors (e.g. the `onboarded` column
      // doesn't exist yet because migration 0002 isn't applied), we MUST
      // NOT trap the user on the onboarding form. Bail to `next` instead.
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("onboarded")
            .eq("id", user.id)
            .maybeSingle();
          if (profileError) {
            console.error("[auth/callback] profile fetch failed:", profileError.message);
            // Schema unknown — assume onboarded so the user lands somewhere usable.
            return NextResponse.redirect(new URL(next, url.origin));
          }
          const onboarded = (profile as { onboarded?: boolean } | null)?.onboarded;
          if (onboarded === false) {
            const target = new URL("/onboarding/profile", url.origin);
            target.searchParams.set("next", next);
            return NextResponse.redirect(target);
          }
        }
      } catch (err) {
        console.error("[auth/callback] post-exchange flow failed:", err);
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
    console.error("[auth/callback] exchange failed:", error.message);
  }

  // Anything went wrong — bounce to the sign-in page with an error flag.
  return NextResponse.redirect(new URL("/auth/signin?error=oauth", url.origin));
}
