"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/store/theme";
import { cn } from "@/lib/utils";

/**
 * 3-way theme picker: Light · Dark · System.
 * Renders an inline segmented control on lg+ and a single cycle button on
 * mobile (saves header real-estate).
 */
export function ThemeToggle() {
  const preference = useTheme((s) => s.preference);
  const setPref = useTheme((s) => s.set);
  const cycle = useTheme((s) => s.cycle);

  // Avoid hydration mismatch: render a placeholder until client knows the
  // persisted preference.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  if (!hydrated) return <div className="h-9 w-9 lg:w-[114px]" aria-hidden />;

  const items = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <>
      {/* Mobile: single cycle button */}
      <button
        type="button"
        onClick={cycle}
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-border/70 hover:bg-card hover:text-foreground lg:hidden"
        aria-label={`Theme: ${preference}. Click to cycle.`}
        title={`Theme: ${preference}`}
      >
        {preference === "light" ? (
          <Sun className="h-4 w-4" aria-hidden />
        ) : preference === "dark" ? (
          <Moon className="h-4 w-4" aria-hidden />
        ) : (
          <Monitor className="h-4 w-4" aria-hidden />
        )}
      </button>

      {/* Desktop: segmented control */}
      <div
        className="hidden h-9 items-center gap-0.5 rounded-lg border border-border/70 bg-card/60 p-0.5 lg:flex"
        role="radiogroup"
        aria-label="Theme"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = preference === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPref(item.id)}
              title={item.label}
              className={cn(
                "inline-flex h-7 w-9 cursor-pointer items-center justify-center rounded-md text-xs transition-colors duration-150",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
