"use client";

import { useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useUser } from "@/app/auth/user-provider";
import { useWatchlist } from "./watchlist";

const MERGED_FLAG_KEY = "stockvision.watchlist-merged.v1";

/**
 * Hooks the local Zustand watchlist into Supabase when the user is signed in.
 *
 *   • On signin: read Supabase rows + merge any localStorage entries that
 *     aren't yet on the server (one-time per session per user).
 *   • On every local change while signed in: write through to Supabase.
 *   • On signout: nothing - local store keeps whatever was last there.
 *
 * NOTE: we use the un-generic Supabase client here for write-side ops so
 * we don't fight the SDK's deep generic inference (which mis-resolves our
 * Database.Insert as `never` despite explicit shapes). Reads stay typed
 * via inline assertions on the small result rows.
 */

interface ServerRow {
  symbol: string;
  position: number;
}

function getClient(): SupabaseClient {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export function useWatchlistSync() {
  const { user } = useUser();
  const tickers = useWatchlist((s) => s.tickers);
  const reorder = useWatchlist((s) => s.reorder);
  const isMergingRef = useRef(false);
  const lastSyncedRef = useRef<string>("");

  // Initial pull + merge on signin (one-time per session per user)
  useEffect(() => {
    if (!user) return;
    const mergeFlag = `${MERGED_FLAG_KEY}:${user.id}`;
    if (sessionStorage.getItem(mergeFlag)) {
      void pullFromServer(user.id, reorder, isMergingRef);
      return;
    }
    void mergeAndPull(user.id, useWatchlist.getState().tickers, reorder, isMergingRef).then(() => {
      sessionStorage.setItem(mergeFlag, "1");
    });
  }, [user, reorder]);

  // Write-through: on every local change while signed in, mirror to Supabase
  useEffect(() => {
    if (!user) return;
    if (isMergingRef.current) return;
    const serialized = JSON.stringify(tickers);
    if (serialized === lastSyncedRef.current) return;
    lastSyncedRef.current = serialized;

    void writeServerState(user.id, tickers);
  }, [user, tickers]);
}

async function pullFromServer(
  userId: string,
  reorder: (next: string[]) => void,
  isMergingRef: React.MutableRefObject<boolean>,
) {
  isMergingRef.current = true;
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("watchlists")
      .select("symbol, position")
      .eq("user_id", userId)
      .order("position", { ascending: true });
    if (error) {
      console.error("[watchlist-sync] pull failed:", error.message);
      return;
    }
    const tickers = ((data ?? []) as ServerRow[])
      .sort((a, b) => a.position - b.position)
      .map((r) => r.symbol);
    reorder(tickers);
  } finally {
    isMergingRef.current = false;
  }
}

async function mergeAndPull(
  userId: string,
  localTickers: string[],
  reorder: (next: string[]) => void,
  isMergingRef: React.MutableRefObject<boolean>,
) {
  isMergingRef.current = true;
  try {
    const supabase = getClient();
    const { data: existing, error: readErr } = await supabase
      .from("watchlists")
      .select("symbol, position")
      .eq("user_id", userId);
    if (readErr) {
      console.error("[watchlist-sync] merge read failed:", readErr.message);
      return;
    }
    const existingRows = (existing ?? []) as ServerRow[];
    const existingSet = new Set(existingRows.map((r) => r.symbol));
    const toInsert = localTickers
      .filter((t) => !existingSet.has(t))
      .map((symbol, i) => ({
        user_id: userId,
        symbol,
        position: existingRows.length + i,
      }));
    if (toInsert.length > 0) {
      const { error: insErr } = await supabase
        .from("watchlists")
        .upsert(toInsert, { onConflict: "user_id,symbol" });
      if (insErr) console.error("[watchlist-sync] insert failed:", insErr.message);
    }
    const { data: merged } = await supabase
      .from("watchlists")
      .select("symbol, position")
      .eq("user_id", userId)
      .order("position", { ascending: true });
    const tickers = ((merged ?? []) as ServerRow[]).map((r) => r.symbol);
    reorder(tickers);
  } finally {
    isMergingRef.current = false;
  }
}

async function writeServerState(userId: string, tickers: string[]) {
  const supabase = getClient();
  // Full replacement strategy: simplest reliable sync for small lists.
  // Watchlists are capped at 30 entries so this is cheap.
  const { error: delErr } = await supabase.from("watchlists").delete().eq("user_id", userId);
  if (delErr) {
    console.error("[watchlist-sync] write delete failed:", delErr.message);
    return;
  }
  if (tickers.length === 0) return;
  const rows = tickers.map((symbol, i) => ({ user_id: userId, symbol, position: i }));
  const { error: insErr } = await supabase.from("watchlists").insert(rows);
  if (insErr) console.error("[watchlist-sync] write insert failed:", insErr.message);
}
