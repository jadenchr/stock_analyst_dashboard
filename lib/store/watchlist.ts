"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeTicker } from "@/lib/utils/validators";

const MAX_WATCHLIST = 30;
const STORAGE_KEY = "stockvision.watchlist.v1";

interface WatchlistState {
  tickers: string[];
  add: (ticker: string) => void;
  remove: (ticker: string) => void;
  reorder: (tickers: string[]) => void;
  has: (ticker: string) => boolean;
  clear: () => void;
}

export const useWatchlist = create<WatchlistState>()(
  persist(
    (set, get) => ({
      tickers: [],
      add: (ticker: string) => {
        const clean = safeTicker(ticker);
        if (!clean) return;
        const current = get().tickers;
        if (current.includes(clean)) return;
        if (current.length >= MAX_WATCHLIST) return;
        set({ tickers: [...current, clean] });
      },
      remove: (ticker: string) => {
        const clean = safeTicker(ticker);
        if (!clean) return;
        set({ tickers: get().tickers.filter((t) => t !== clean) });
      },
      reorder: (tickers: string[]) => {
        const cleaned = tickers
          .map(safeTicker)
          .filter((t): t is string => t !== null)
          .slice(0, MAX_WATCHLIST);
        set({ tickers: Array.from(new Set(cleaned)) });
      },
      has: (ticker: string) => {
        const clean = safeTicker(ticker);
        return clean ? get().tickers.includes(clean) : false;
      },
      clear: () => set({ tickers: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Defensive: revalidate on hydrate to drop any malformed entries from older versions
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const cleaned = state.tickers
          .map(safeTicker)
          .filter((t): t is string => t !== null)
          .slice(0, MAX_WATCHLIST);
        state.tickers = Array.from(new Set(cleaned));
      },
    },
  ),
);
