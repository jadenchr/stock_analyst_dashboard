import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServerWriteClient } from "@/lib/supabase/server-write";

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
 *   6. We BOOTSTRAP the profile row — upsert id/email/name/avatar from
 *      the auth metadata so a profile always exists before any
 *      downstream page tries to read it. This protects against the
 *      on-signup DB trigger being missing or skipped (existing users
 *      who signed up before the trigger was deployed don't get one).
 *   7. If the user hasn't completed the onboarding form yet
 *      (`profile.onboarded !== true`), route them to /onboarding/profile
 *      so they always see the visible "your profile was set up"
 *      confirmation step.
 *   8. Otherwise send them to ?next= (default /).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/auth/signin?error=oauth", url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("[auth/callback] exchange failed:", exchangeError.message);
    return NextResponse.redirect(new URL("/auth/signin?error=oauth", url.origin));
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL(next, url.origin));
    }

    // Pull the display fields Google handed back so we can fill in a
    // friendly profile even if the schema is bare-bones.
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const fullName =
      (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? null;
    const avatarUrl =
      (meta.avatar_url as string | undefined) ??
      (meta.picture as string | undefined) ??
      null;

    // Bootstrap the row. We use the cookies-authed write client so RLS
    // attributes the INSERT to this user. Migration 0004 added the
    // `profiles_insert_own` policy that allows this — without that
    // migration this upsert silently fails, which is fine: the user
    // can still complete onboarding which calls the same logic.
    const writeClient = createServerWriteClient();
    const { error: upsertError } = await writeClient
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          full_name: fullName,
          avatar_url: avatarUrl,
        },
        { onConflict: "id" },
      );
    if (upsertError) {
      console.warn("[auth/callback] profile bootstrap upsert failed:", upsertError.message);
    }

    // Now decide where to send them.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      // Schema doesn't have the column we expect — assume we can't gate
      // and let them land on the dashboard. The dashboard will still
      // show their avatar via auth user_metadata even with no row.
      console.error("[auth/callback] profile fetch failed:", profileError.message);
      return NextResponse.redirect(new URL(next, url.origin));
    }

    // Tightened: route to onboarding whenever `onboarded` isn't
    // EXPLICITLY true. Covers brand-new users (undefined / null) as
    // well as users who deliberately have onboarded=false.
    const onboarded = (profile as { onboarded?: boolean | null } | null)?.onboarded;
    if (onboarded !== true) {
      const target = new URL("/onboarding/profile", url.origin);
      target.searchParams.set("next", next);
      return NextResponse.redirect(target);
    }

    return NextResponse.redirect(new URL(next, url.origin));
  } catch (err) {
    console.error("[auth/callback] post-exchange flow failed:", err);
    return NextResponse.redirect(new URL(next, url.origin));
  }
}
