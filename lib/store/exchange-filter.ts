"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ExchangeKey } from "@/lib/supabase/types";

export type ExchangeFilter = "all" | ExchangeKey;

interface ExchangeFilterState {
  filter: ExchangeFilter;
  set: (next: ExchangeFilter) => void;
}

const STORAGE_KEY = "stockvision.exchange-filter.v1";

/**
 * Tiny persisted store for the Markets-page exchange filter chip group.
 * Survives reloads so a Sri Lanka user who selected "CSE" doesn't reset
 * to "All" on every visit. The home page seeds the initial value from
 * the user's profile.preferred_exchanges when none has been chosen yet.
 */
export const useExchangeFilter = create<ExchangeFilterState>()(
  persist(
    (set) => ({
      filter: "all",
      set: (next) => set({ filter: next }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
