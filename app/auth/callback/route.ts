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
 *   5. We exchange that code for a session cookie, then send the user on
 *      to ?next=... (or / by default).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    console.error("[auth/callback] exchange failed:", error.message);
  }

  // Anything went wrong — bounce to the sign-in page with an error flag.
  return NextResponse.redirect(new URL("/auth/signin?error=oauth", url.origin));
}
