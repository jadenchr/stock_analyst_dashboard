import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

/**
 * Un-generic Supabase server client for write operations.
 *
 * The typed `createSupabaseServerClient` collapses our Database Insert
 * shape to `never` at deep call sites (a known SDK quirk). For writes we
 * skip the generic; reads stay strongly typed via the row Row types from
 * `lib/supabase/types`.
 *
 * Important: cookies() is async in Next 15+. We can't `await` inside the
 * synchronous client factory, so this function is sync and the cookie
 * adapter awaits on each access. That's fine — RLS still gates rows by
 * the resolved auth.uid().
 */
export function createServerWriteClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const store = await cookies();
          return store.getAll();
        },
        async setAll(cookiesToSet: CookieToSet[]) {
          try {
            const store = await cookies();
            cookiesToSet.forEach(({ name, value, options }) => {
              store.set(name, value, options);
            });
          } catch {
            // Server Components can't mutate cookies; middleware handles it.
          }
        },
      },
    },
  );
}
