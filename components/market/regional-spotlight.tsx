"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { useRegional } from "@/lib/api/client";
import { useExchangeFilter } from "@/lib/store/exchange-filter";
import type { Quote } from "@/lib/market-data/types";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { SkeletonBlock } from "@/components/ui/skeleton-block";

export function RegionalSpotlight() {
  const { data, isLoading, isError } = useRegional();
  const filter = useExchangeFilter((s) => s.filter);
  // Hide Indian/CSE columns when the user has filtered to a region that
  // doesn't include them.
  const showIndia = filter === "all" || filter === "IN_NSE" || filter === "IN_BSE";
  const showSriLanka = filter === "all" || filter === "LK_CSE";
  if (!showIndia && !showSriLanka) return null;
  const india = showIndia ? data?.india ?? [] : [];
  const sriLanka = showSriLanka ? data?.sriLanka ?? [] : [];

  return (
    <section aria-labelledby="regional-heading" className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 id="regional-heading" className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Regional spotlight
          </h2>
          <p className="text-xs text-muted-foreground">
            Blue-chip stocks from the Bombay Stock Exchange and Colombo Stock Exchange
          </p>
        </div>
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
        )}
      </div>

      {isError && (
        <div className="glass rounded-xl px-4 py-3 text-xs text-muted-foreground">
          Regional data is temporarily unavailable.
        </div>
      )}

      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          showIndia && showSriLanka ? "lg:grid-cols-2" : "lg:grid-cols-1",
        )}
      >
        {showIndia && (
          <RegionColumn
            title="India · NSE / BSE"
            flag="🇮🇳"
            currency="₹"
            rows={india}
            isLoading={isLoading && india.length === 0}
          />
        )}
        {showSriLanka && (
          <RegionColumn
            title="Sri Lanka · CSE"
            flag="🇱🇰"
            currency="LKR"
            rows={sriLanka}
            isLoading={isLoading && sriLanka.length === 0}
            note="CSE coverage limited to live quotes - fundamentals & history unavailable on free tier"
          />
        )}
      </div>
    </section>
  );
}

function RegionColumn({
  title,
  flag,
  currency,
  rows,
  isLoading,
  note,
}: {
  title: string;
  flag: string;
  currency: string;
  rows: Quote[];
  isLoading: boolean;
  note?: string;
}) {
  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span aria-hidden className="text-sm leading-none">{flag}</span>
          {title}
        </h3>
        <span className="font-mono text-[10px] uppercase text-muted-foreground/70">
          {currency}
        </span>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border/40 px-4 py-6 text-center text-xs text-muted-foreground">
          No data
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((q, i) => {
            const positive = q.changePercent >= 0;
            return (
              <motion.li
                key={q.symbol}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href={`/stock/${q.symbol}`}
                  className="group flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors duration-200 hover:border-border/70 hover:bg-card/60"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="font-mono text-sm font-semibold text-foreground group-hover:text-primary">
                      {q.symbol}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">{q.name}</span>
                  </div>
                  <div className="ml-auto flex flex-col items-end">
                    <span className="font-mono text-xs tabular-nums text-foreground">
                      {formatCurrency(q.price, q.currency)}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[11px] tabular-nums",
                        positive ? "text-bull" : "text-bear",
                      )}
                    >
                      {formatPercent(q.changePercent)}
                    </span>
                  </div>
                  <ArrowUpRight
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden
                  />
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}

      {note && (
        <p className="border-t border-border/40 pt-2 text-[10px] leading-relaxed text-muted-foreground">
          {note}
        </p>
      )}
    </div>
  );
}
