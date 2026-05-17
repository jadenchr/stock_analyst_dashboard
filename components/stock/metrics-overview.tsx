"use client";

import { motion } from "framer-motion";
import { Activity, BarChart3, Coins, Gauge, Layers, Percent } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { useFundamentals } from "@/lib/api/client";

interface Props {
  symbol: string;
}

function pct(v: number | null | undefined): number | null {
  // Yahoo returns ratios as 0..1, normalize to 0..100 for display
  if (v == null) return null;
  return v * 100;
}

export function MetricsOverview({ symbol }: Props) {
  const { data, isLoading } = useFundamentals(symbol);

  if (isLoading && !data) {
    return (
      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass flex flex-col gap-2 rounded-xl p-4">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-6 w-20" />
            <SkeletonBlock className="h-3 w-10" />
          </div>
        ))}
      </section>
    );
  }

  if (!data) return null;

  const v = data.valuation;
  const p = data.profitability;
  const g = data.growth;

  return (
    <motion.section
      aria-label="Key metrics"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
    >
      <MetricCard
        index={0}
        label="P/E (TTM)"
        value={v.peTrailing}
        format={(x) => x.toFixed(2)}
        tone="default"
        description="Trailing 12-month price-to-earnings ratio"
      />
      <MetricCard
        index={1}
        label="P/E (FWD)"
        value={v.peForward}
        format={(x) => x.toFixed(2)}
        tone="default"
        hint="Forward estimates"
      />
      <MetricCard
        index={2}
        label="PEG"
        value={v.pegRatio}
        format={(x) => x.toFixed(2)}
        tone={v.pegRatio != null ? (v.pegRatio < 1 ? "bull" : v.pegRatio > 2 ? "bear" : "neutral") : "default"}
        hint="P/E ÷ growth"
      />
      <MetricCard
        index={3}
        label="EV/EBITDA"
        value={v.evToEbitda}
        format={(x) => `${x.toFixed(1)}x`}
        tone="default"
      />
      <MetricCard
        index={4}
        label="Op Margin"
        value={pct(p.operatingMargin)}
        format={(x) => `${x.toFixed(1)}%`}
        tone={p.operatingMargin != null && p.operatingMargin > 0.15 ? "bull" : "neutral"}
      />
      <MetricCard
        index={5}
        label="Rev Growth"
        value={pct(g.revenueGrowth)}
        format={(x) => `${x.toFixed(1)}%`}
        tone={
          g.revenueGrowth == null
            ? "default"
            : g.revenueGrowth > 0.05
              ? "bull"
              : g.revenueGrowth < 0
                ? "bear"
                : "neutral"
        }
        hint="YoY"
      />
    </motion.section>
  );
}

/* ------------------------------------------------------------------ icons */
// (exported icons unused by parent but kept for callers wanting custom legends)
export const METRIC_ICONS = { Activity, BarChart3, Coins, Gauge, Layers, Percent };
