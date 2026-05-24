"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/app/auth/user-provider";
import {
  DEFAULT_GUEST_EXCHANGES,
  EXCHANGE_LABELS,
  type ExchangeKey,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type MarketStatus = "OPEN" | "PRE_MARKET" | "AFTER_HOURS" | "CLOSED";

interface StatusConfig {
  label: string;
  dotClass: string;
  textClass: string;
  pulse: boolean;
}

const CONFIG: Record<MarketStatus, StatusConfig> = {
  OPEN: { label: "Open", dotClass: "bg-bull", textClass: "text-bull", pulse: true },
  PRE_MARKET: {
    label: "Pre",
    dotClass: "bg-neutral",
    textClass: "text-neutral",
    pulse: false,
  },
  AFTER_HOURS: {
    label: "After",
    dotClass: "bg-neutral",
    textClass: "text-neutral",
    pulse: false,
  },
  CLOSED: {
    label: "Closed",
    dotClass: "bg-muted-foreground",
    textClass: "text-muted-foreground",
    pulse: false,
  },
};

interface ExchangeHours {
  preOpen: number; // mins-of-day
  open: number;
  close: number;
  afterClose: number;
  /** 0=Sun..6=Sat; 1-5 = M-F */
  tradingDays: number[];
}

const HOURS: Record<ExchangeKey, ExchangeHours> = {
  US: {
    preOpen: 4 * 60,
    open: 9 * 60 + 30,
    close: 16 * 60,
    afterClose: 20 * 60,
    tradingDays: [1, 2, 3, 4, 5],
  },
  IN_NSE: {
    preOpen: 9 * 60,
    open: 9 * 60 + 15,
    close: 15 * 60 + 30,
    afterClose: 16 * 60,
    tradingDays: [1, 2, 3, 4, 5],
  },
  IN_BSE: {
    preOpen: 9 * 60,
    open: 9 * 60 + 15,
    close: 15 * 60 + 30,
    afterClose: 16 * 60,
    tradingDays: [1, 2, 3, 4, 5],
  },
  LK_CSE: {
    preOpen: 9 * 60,
    open: 9 * 60 + 30,
    close: 14 * 60 + 30,
    afterClose: 15 * 60,
    tradingDays: [1, 2, 3, 4, 5],
  },
  UK: {
    preOpen: 7 * 60,
    open: 8 * 60,
    close: 16 * 60 + 30,
    afterClose: 17 * 60,
    tradingDays: [1, 2, 3, 4, 5],
  },
  CRYPTO: {
    preOpen: 0,
    open: 0,
    close: 24 * 60,
    afterClose: 24 * 60,
    tradingDays: [0, 1, 2, 3, 4, 5, 6],
  },
};

const SHORT_CODE: Record<ExchangeKey, string> = {
  US: "US",
  IN_NSE: "NSE",
  IN_BSE: "BSE",
  LK_CSE: "CSE",
  UK: "LSE",
  CRYPTO: "CRYPTO",
};

/**
 * Compute market status from current time in the exchange's local TZ.
 * Approximation only - does not account for public holidays. Crypto is
 * special-cased to always return OPEN.
 */
function computeStatus(now: Date, exchange: ExchangeKey): MarketStatus {
  if (exchange === "CRYPTO") return "OPEN";
  const hours = HOURS[exchange];
  const tz = EXCHANGE_LABELS[exchange].tz;
  const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  const day = local.getDay();
  if (!hours.tradingDays.includes(day)) return "CLOSED";

  const minutes = local.getHours() * 60 + local.getMinutes();
  if (minutes >= hours.open && minutes < hours.close) return "OPEN";
  if (minutes >= hours.preOpen && minutes < hours.open) return "PRE_MARKET";
  if (minutes >= hours.close && minutes < hours.afterClose) return "AFTER_HOURS";
  return "CLOSED";
}

/**
 * Compact header strip showing the user's preferred exchanges + live status.
 * Falls back to a sensible guest set (US + IN_NSE + LK_CSE) when not signed
 * in or when the user hasn't completed onboarding yet.
 */
export function MarketStatusPill() {
  const { profile, user } = useUser();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const exchanges: ExchangeKey[] =
    user && profile?.preferred_exchanges?.length
      ? profile.preferred_exchanges.slice(0, 4) // cap header width
      : DEFAULT_GUEST_EXCHANGES;

  if (!now) {
    // Pre-hydration placeholder to avoid layout shift
    return (
      <div className="inline-flex items-center gap-1.5" aria-hidden>
        {exchanges.map((e) => (
          <span
            key={e}
            className="inline-flex h-6 w-20 items-center rounded-full border border-border/70 bg-card/60"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="inline-flex flex-wrap items-center gap-1.5"
      aria-label="Market status by exchange"
      aria-live="polite"
    >
      {exchanges.map((exchange) => {
        const status = computeStatus(now, exchange);
        const cfg = CONFIG[status];
        const meta = EXCHANGE_LABELS[exchange];
        return (
          <span
            key={exchange}
            title={`${meta.label} · ${cfg.label}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-2 py-0.5 text-[11px] font-medium"
          >
            <span className="relative flex h-1.5 w-1.5 items-center justify-center">
              {cfg.pulse && (
                <span
                  className={cn(
                    "absolute h-full w-full rounded-full opacity-50",
                    cfg.dotClass,
                  )}
                  style={{ animation: "ping 1.8s cubic-bezier(0,0,0.2,1) infinite" }}
                />
              )}
              <span className={cn("relative h-1.5 w-1.5 rounded-full", cfg.dotClass)} />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {SHORT_CODE[exchange]}
            </span>
            <span className={cfg.textClass}>{cfg.label}</span>
          </span>
        );
      })}
    </div>
  );
}
