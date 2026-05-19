"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";
import { useMarketOverview } from "@/lib/api/client";
import { useExchangeFilter } from "@/lib/store/exchange-filter";
import { cn } from "@/lib/utils";
import { formatCompact, formatPercent } from "@/lib/utils/format";

// Map our internal exchange keys to the symbols Yahoo returns for the
// global indices grid. Filter the indices list when a non-"all" filter
// is active.
const INDEX_FILTER: Record<string, string[]> = {
  US: ["^GSPC", "^IXIC", "^DJI"],
  IN_NSE: ["^NSEI"],
  IN_BSE: ["^BSESN"],
  LK_CSE: ["ASPI", "SP-SL20"],
  UK: ["^FTSE"],
  CRYPTO: ["BTC-USD"],
};

export function IndicesGrid() {
  const { data, isLoading, isError } = useMarketOverview();
  const filter = useExchangeFilter((s) => s.filter);
  const allIndices = data?.indices ?? [];
  const indices =
    filter === "all"
      ? allIndices
      : allIndices.filter((i) => (INDEX_FILTER[filter] ?? []).includes(i.symbol));

  return (
    <section aria-labelledby="indices-heading" className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h2
            id="indices-heading"
            className="font-display text-2xl tracking-tight text-foreground"
          >
            Global Indices
          </h2>
          <p className="text-xs text-muted-foreground">
            Snapshot of major equity and crypto benchmarks · live via Yahoo Finance
          </p>
        </div>
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
        )}
      </div>

      {isError && (
        <div className="glass rounded-xl px-4 py-3 text-xs text-muted-foreground">
          Index data is temporarily unavailable. Will retry automatically.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {isLoading && indices.length === 0
          ? Array.from({ length: 6 }).map((_, i) => <IndexSkeleton key={i} />)
          : indices.map((idx, i) => {
              const positive = idx.changePercent >= 0;
              const Arrow = positive ? ArrowUpRight : ArrowDownRight;
              return (
                <motion.article
                  key={idx.symbol}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  className="glass group flex flex-col gap-2 rounded-xl p-4 transition-all duration-200 ease-out-expo hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {idx.name}
                    </span>
                    <Arrow
                      className={cn("h-3.5 w-3.5", positive ? "text-bull" : "text-bear")}
                      aria-hidden
                    />
                  </div>
                  <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
                    {formatCompact(idx.value)}
                  </p>
                  <p
                    className={cn(
                      "font-mono text-xs tabular-nums",
                      positive ? "text-bull" : "text-bear",
                    )}
                  >
                    {formatPercent(idx.changePercent)}
                  </p>
                </motion.article>
              );
            })}
      </div>
    </section>
  );
}

function IndexSkeleton() {
  return (
    <div className="glass flex flex-col gap-2 rounded-xl p-4">
      <div className="skeleton h-3 w-20 rounded" />
      <div className="skeleton h-5 w-16 rounded" />
      <div className="skeleton h-3 w-12 rounded" />
    </div>
  );
}
