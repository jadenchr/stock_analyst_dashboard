"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { useMovers, type Mover } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { SkeletonBlock } from "@/components/ui/skeleton-block";

export function TopMovers() {
  const { data, isLoading, isError } = useMovers();
  const gainers = data?.gainers ?? [];
  const losers = data?.losers ?? [];

  return (
    <section aria-labelledby="movers-heading" className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 id="movers-heading" className="font-display text-2xl tracking-tight text-foreground">
            Today&rsquo;s biggest movers
          </h2>
          <p className="text-xs text-muted-foreground">
            Largest absolute % moves in US equities · refreshes every 5 minutes
          </p>
        </div>
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
        )}
      </div>

      {isError && (
        <div className="glass rounded-xl px-4 py-3 text-xs text-muted-foreground">
          Mover data is temporarily unavailable.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MoversColumn
          title="Top gainers"
          icon={<TrendingUp className="h-3.5 w-3.5 text-bull" aria-hidden />}
          rows={gainers}
          tone="bull"
          isLoading={isLoading && gainers.length === 0}
        />
        <MoversColumn
          title="Top losers"
          icon={<TrendingDown className="h-3.5 w-3.5 text-bear" aria-hidden />}
          rows={losers}
          tone="bear"
          isLoading={isLoading && losers.length === 0}
        />
      </div>
    </section>
  );
}

function MoversColumn({
  title,
  icon,
  rows,
  tone,
  isLoading,
}: {
  title: string;
  icon: React.ReactNode;
  rows: Mover[];
  tone: "bull" | "bear";
  isLoading: boolean;
}) {
  const Arrow = tone === "bull" ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-4">
      <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        {title}
      </h3>
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border/40 px-4 py-6 text-center text-xs text-muted-foreground">
          No data
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((m, i) => (
            <motion.li
              key={m.symbol}
              initial={{ opacity: 0, x: tone === "bull" ? -4 : 4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={`/stock/${m.symbol}`}
                className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors hover:border-border/70 hover:bg-card/60"
              >
                <span className="font-mono text-sm font-semibold text-foreground">{m.symbol}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {m.name}
                </span>
                <span className="font-mono text-xs tabular-nums text-foreground">
                  {formatCurrency(m.price)}
                </span>
                <span
                  className={cn(
                    "inline-flex w-20 items-center justify-end gap-1 font-mono text-xs font-semibold tabular-nums",
                    tone === "bull" ? "text-bull" : "text-bear",
                  )}
                >
                  <Arrow className="h-3 w-3" aria-hidden />
                  {formatPercent(m.changePercent)}
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
