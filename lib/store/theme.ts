"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeState {
  preference: ThemePreference;
  set: (next: ThemePreference) => void;
  cycle: () => void;
}

const STORAGE_KEY = "stockvision.theme.v1";

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      preference: "dark",
      set: (next) => set({ preference: next }),
      cycle: () => {
        const cur = get().preference;
        const next: ThemePreference =
          cur === "light" ? "dark" : cur === "dark" ? "system" : "light";
        set({ preference: next });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function resolveTheme(pref: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (pref === "system") return prefersDark ? "dark" : "light";
  return pref;
}
