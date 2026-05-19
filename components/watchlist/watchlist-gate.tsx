"use client";

import { useUser } from "@/app/auth/user-provider";
import { WatchlistDemo } from "./watchlist-demo";
import { WatchlistTable } from "./watchlist-table";

/**
 * Routes between the signed-out demo (5 blue-chip live preview rows + CTA)
 * and the real signed-in table (drag-to-reorder, Supabase synced).
 *
 * Done as a client component because `useUser()` reads the live auth
 * state — server-side would require fetching the session for every page
 * render, which the global UserProvider already handles.
 */
export function WatchlistGate() {
  const { user, isLoading } = useUser();
  if (isLoading) return null;
  if (!user) return <WatchlistDemo />;
  return <WatchlistTable />;
}
