import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database, Profile } from "./types";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

/**
 * Server-side Supabase client for Server Components, Route Handlers, and
 * Server Actions. Wraps Next's async `cookies()` for session reads /
 * refreshes during render. The `set` call is wrapped in try/catch because
 * cookies can't be mutated during a render of a Server Component - the
 * middleware (see /middleware.ts) handles refresh outside the render tree.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components can't mutate cookies. Middleware handles it.
          }
        },
      },
    },
  );
}

/**
 * Fetch the current user's auth row. Returns null when unauthenticated.
 * Use this in Server Components / Route Handlers to gate features.
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Convenience: fetch the user + their profile row in one round-trip.
 * Returns { user: null, profile: null } when not signed in. When the user
 * is signed in but the profile row is missing (trigger lag, RLS blip,
 * or pre-schema signup), profile is null but user is still populated -
 * the entitlement system treats this as `free`, not `guest`.
 */
export async function getCurrentSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return { user, profile: (profile ?? null) as Profile | null };
}
