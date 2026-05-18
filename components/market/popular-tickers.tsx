"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useMarketOverview } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

export function PopularTickers() {
  const { data, isLoading, isError } = useMarketOverview();
  const popular = data?.popular ?? [];

  return (
    <section aria-labelledby="popular-heading" className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 id="popular-heading" className="font-display text-2xl tracking-tight text-foreground">
            Popular Tickers
          </h2>
          <p className="text-xs text-muted-foreground">
            Tap any card to open the dashboard · prices via Yahoo Finance
          </p>
        </div>
      </div>

      {isError && (
        <div className="glass rounded-xl px-4 py-3 text-xs text-muted-foreground">
          Quote data is temporarily unavailable. Will retry automatically.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading && popular.length === 0
          ? Array.from({ length: 8 }).map((_, i) => <PopularSkeleton key={i} />)
          : popular.map((q, i) => {
              const positive = q.changePercent >= 0;
              return (
                <motion.div
                  key={q.symbol}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={`/stock/${q.symbol}`}
                    className="glass group block cursor-pointer rounded-xl p-4 transition-all duration-200 ease-out-expo hover:-translate-y-0.5 hover:border-border hover:bg-card/70 hover:shadow-elevated"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-base font-semibold tracking-wide text-foreground">
                            {q.symbol}
                          </span>
                          <span className="badge-ticker">{q.exchange.slice(0, 8)}</span>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">{q.name}</p>
                      </div>
                      <ArrowUpRight
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden
                      />
                    </div>

                    <div className="mt-4 flex items-end justify-between">
                      <p className="font-mono text-xl font-semibold tabular-nums text-foreground">
                        {formatCurrency(q.price, q.currency)}
                      </p>
                      <p
                        className={cn(
                          "font-mono text-sm tabular-nums",
                          positive ? "text-bull" : "text-bear",
                        )}
                      >
                        {formatPercent(q.changePercent)}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
      </div>
    </section>
  );
}

function PopularSkeleton() {
  return (
    <div className="glass flex flex-col gap-3 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <div className="skeleton h-4 w-16 rounded" />
        <div className="skeleton h-3 w-10 rounded" />
      </div>
      <div className="skeleton h-3 w-40 rounded" />
      <div className="mt-4 flex justify-between">
        <div className="skeleton h-5 w-20 rounded" />
        <div className="skeleton h-3 w-12 rounded" />
      </div>
    </div>
  );
}
