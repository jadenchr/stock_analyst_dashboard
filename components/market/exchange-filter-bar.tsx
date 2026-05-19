"use client";

import { useEffect } from "react";
import { Globe2 } from "lucide-react";
import { useUser } from "@/app/auth/user-provider";
import { useExchangeFilter, type ExchangeFilter } from "@/lib/store/exchange-filter";
import { cn } from "@/lib/utils";

const OPTIONS: { id: ExchangeFilter; label: string; flag: string }[] = [
  { id: "all", label: "All", flag: "🌎" },
  { id: "US", label: "US", flag: "🇺🇸" },
  { id: "IN_NSE", label: "NSE", flag: "🇮🇳" },
  { id: "IN_BSE", label: "BSE", flag: "🇮🇳" },
  { id: "LK_CSE", label: "CSE", flag: "🇱🇰" },
  { id: "UK", label: "UK", flag: "🇬🇧" },
  { id: "CRYPTO", label: "Crypto", flag: "₿" },
];

/**
 * Markets-page chip group. Drives the filter for IndicesGrid, TopMovers,
 * PopularTickers, RegionalSpotlight, and SectorHeatmap (sectors are
 * US-equity-only — hidden when filter is non-US).
 *
 * On first visit, seeds from the signed-in user's preferred_exchanges
 * (picking the first one) so a returning user lands in the right region.
 */
export function ExchangeFilterBar() {
  const filter = useExchangeFilter((s) => s.filter);
  const setFilter = useExchangeFilter((s) => s.set);
  const { profile, user } = useUser();

  // Seed the persisted filter from profile preferred_exchanges the first
  // time after signin (when the value is still the default "all").
  useEffect(() => {
    if (!user) return;
    if (filter !== "all") return; // user already picked something
    const first = profile?.preferred_exchanges?.[0];
    if (first) setFilter(first);
    // intentionally run once per user identity change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-2 sm:p-3">
      <span className="hidden items-center gap-1.5 pl-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:inline-flex">
        <Globe2 className="h-3 w-3" aria-hidden />
        Exchange
      </span>
      <div
        role="radiogroup"
        aria-label="Exchange filter"
        className="-mx-1 flex flex-1 items-center gap-1 overflow-x-auto px-1"
      >
        {OPTIONS.map((o) => {
          const active = o.id === filter;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setFilter(o.id)}
              className={cn(
                "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <span aria-hidden className="text-sm leading-none">{o.flag}</span>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
