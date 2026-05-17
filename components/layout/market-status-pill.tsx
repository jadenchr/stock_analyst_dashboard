"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type MarketStatus = "OPEN" | "PRE_MARKET" | "AFTER_HOURS" | "CLOSED";

interface StatusConfig {
  label: string;
  dotClass: string;
  textClass: string;
  pulse: boolean;
}

const CONFIG: Record<MarketStatus, StatusConfig> = {
  OPEN: { label: "Markets Open", dotClass: "bg-bull", textClass: "text-bull", pulse: true },
  PRE_MARKET: { label: "Pre-Market", dotClass: "bg-neutral", textClass: "text-neutral", pulse: false },
  AFTER_HOURS: {
    label: "After Hours",
    dotClass: "bg-neutral",
    textClass: "text-neutral",
    pulse: false,
  },
  CLOSED: { label: "Markets Closed", dotClass: "bg-muted-foreground", textClass: "text-muted-foreground", pulse: false },
};

/**
 * Compute US equity market status from current time. Approximation only —
 * does not account for holidays. Will be replaced with a server-supplied
 * status in Phase 2.
 */
function computeStatus(now: Date): MarketStatus {
  // Convert to NY time
  const ny = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = ny.getDay(); // 0 Sun .. 6 Sat
  if (day === 0 || day === 6) return "CLOSED";

  const minutes = ny.getHours() * 60 + ny.getMinutes();
  const preOpen = 4 * 60; // 4:00 AM
  const open = 9 * 60 + 30; // 9:30 AM
  const close = 16 * 60; // 4:00 PM
  const afterClose = 20 * 60; // 8:00 PM

  if (minutes >= open && minutes < close) return "OPEN";
  if (minutes >= preOpen && minutes < open) return "PRE_MARKET";
  if (minutes >= close && minutes < afterClose) return "AFTER_HOURS";
  return "CLOSED";
}

export function MarketStatusPill() {
  // Default to CLOSED on server, then hydrate on client to avoid TZ mismatches
  const [status, setStatus] = useState<MarketStatus>("CLOSED");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const update = () => setStatus(computeStatus(new Date()));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  const cfg = CONFIG[status];

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium"
      aria-live={hydrated ? "polite" : "off"}
    >
      <span className="relative flex h-2 w-2 items-center justify-center">
        {cfg.pulse && (
          <span
            className={cn("absolute h-full w-full rounded-full opacity-60", cfg.dotClass)}
            style={{ animation: "ping 1.8s cubic-bezier(0,0,0.2,1) infinite" }}
          />
        )}
        <span className={cn("relative h-2 w-2 rounded-full", cfg.dotClass)} />
      </span>
      <span className={cfg.textClass}>{cfg.label}</span>
    </span>
  );
}
