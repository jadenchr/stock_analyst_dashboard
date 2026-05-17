"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeTicker } from "@/lib/utils/validators";

const STORAGE_KEY = "stockvision.recent-searches.v1";
const MAX_RECENT = 8;

interface SearchState {
  open: boolean;
  recent: string[];
  setOpen: (open: boolean) => void;
  toggle: () => void;
  pushRecent: (ticker: string) => void;
  clearRecent: () => void;
}

export const useSearch = create<SearchState>()(
  persist(
    (set, get) => ({
      open: false,
      recent: [],
      setOpen: (open) => set({ open }),
      toggle: () => set({ open: !get().open }),
      pushRecent: (ticker: string) => {
        const clean = safeTicker(ticker);
        if (!clean) return;
        const next = [clean, ...get().recent.filter((t) => t !== clean)].slice(0, MAX_RECENT);
        set({ recent: next });
      },
      clearRecent: () => set({ recent: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist recent searches — open state should always start false
      partialize: (state) => ({ recent: state.recent }) as Pick<SearchState, "recent">,
    },
  ),
);
