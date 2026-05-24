"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme, type ThemePreference } from "@/lib/store/theme";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ id: ThemePreference; label: string; description: string; icon: typeof Sun }> = [
  { id: "light", label: "Light", description: "Bright surfaces, high contrast", icon: Sun },
  { id: "dark", label: "Dark", description: "Default - OLED-true terminal feel", icon: Moon },
  { id: "system", label: "System", description: "Match your OS preference", icon: Monitor },
];

export function SettingsThemeCard() {
  const preference = useTheme((s) => s.preference);
  const setPref = useTheme((s) => s.set);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <section
      aria-labelledby="theme-heading"
      className="glass flex flex-col gap-4 rounded-2xl p-5"
    >
      <div>
        <h2 id="theme-heading" className="text-sm font-semibold text-foreground">
          Appearance
        </h2>
        <p className="text-xs text-muted-foreground">
          Persisted locally · applies across every page
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = hydrated && preference === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPref(opt.id)}
              className={cn(
                "group flex cursor-pointer flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-200 ease-out-expo",
                active
                  ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                  : "border-border/60 bg-card/40 hover:-translate-y-0.5 hover:border-border hover:bg-card/70",
              )}
              aria-pressed={active}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {opt.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
