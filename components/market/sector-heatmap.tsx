"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useSectors, type Sector } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/utils/format";
import { SkeletonBlock } from "@/components/ui/skeleton-block";

/**
 * Map % change to a HSL background. The scale saturates at ±2% so a single
 * card never washes out the rest of the grid.
 */
function backgroundForPct(pct: number): string {
  const clamped = Math.max(-2, Math.min(2, pct));
  const intensity = Math.abs(clamped) / 2; // 0..1
  // hsl 160 bull / 350 bear / 240 neutral baseline
  if (clamped > 0) {
    return `hsl(160 100% ${50 - intensity * 22}% / ${0.18 + intensity * 0.5})`;
  }
  if (clamped < 0) {
    return `hsl(350 100% ${62 - intensity * 25}% / ${0.18 + intensity * 0.5})`;
  }
  return "hsl(240 6% 14% / 0.6)";
}

export function SectorHeatmap() {
  const { data, isLoading, isError } = useSectors();
  const sectors = data ?? [];

  return (
    <section aria-labelledby="sectors-heading" className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 id="sectors-heading" className="font-display text-2xl tracking-tight text-foreground">
            Sector heatmap
          </h2>
          <p className="text-xs text-muted-foreground">
            SPDR sector ETFs · click a tile to view the underlying fund
          </p>
        </div>
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
        )}
      </div>

      {isError && (
        <div className="glass rounded-xl px-4 py-3 text-xs text-muted-foreground">
          Sector data is temporarily unavailable.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {isLoading && sectors.length === 0
          ? Array.from({ length: 11 }).map((_, i) => (
              <SkeletonBlock key={i} className="aspect-[5/3] rounded-xl" />
            ))
          : sectors.map((s, i) => <SectorTile key={s.symbol} sector={s} index={i} />)}
      </div>
    </section>
  );
}

function SectorTile({ sector, index }: { sector: Sector; index: number }) {
  const positive = sector.changePercent >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/stock/${sector.symbol}`}
        className="group flex aspect-[5/3] flex-col justify-between rounded-xl border border-border/40 p-3 transition-all hover:scale-[1.02] hover:border-border/70"
        style={{ backgroundColor: backgroundForPct(sector.changePercent) }}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/85">
            {sector.name}
          </span>
          <span className="badge-ticker">{sector.symbol}</span>
        </div>
        <p
          className={cn(
            "font-mono text-lg font-semibold tabular-nums",
            positive ? "text-bull" : "text-bear",
          )}
        >
          {formatPercent(sector.changePercent)}
        </p>
      </Link>
    </motion.div>
  );
}
