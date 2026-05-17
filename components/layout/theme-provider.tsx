"use client";

import { useEffect } from "react";
import { resolveTheme, useTheme } from "@/lib/store/theme";

/**
 * Applies the resolved theme to <html>. Listens to system preference changes
 * so the "system" option reacts live without a refresh.
 *
 * The very first paint is handled by `public/theme-init.js` (no FOUC).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useTheme((s) => s.preference);

  useEffect(() => {
    const apply = () => {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const resolved = resolveTheme(preference, mql.matches);
      const html = document.documentElement;
      html.classList.remove("light", "dark");
      html.classList.add(resolved);
      html.style.colorScheme = resolved;
    };

    apply();

    // React to OS-level theme changes only when the user picked "system"
    if (preference === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => apply();
      mql.addEventListener("change", listener);
      return () => mql.removeEventListener("change", listener);
    }
  }, [preference]);

  return <>{children}</>;
}
