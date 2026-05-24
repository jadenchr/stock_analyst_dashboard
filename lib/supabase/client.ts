"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Browser-side Supabase client. Reads session cookies set by the server
 * helpers and is suitable for client components.
 *
 * `createBrowserClient` is safe to call multiple times - internally it
 * de-dupes by URL. We export both the factory and a singleton.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
