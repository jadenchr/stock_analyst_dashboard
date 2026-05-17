"use client";

import { PeerBar } from "@/components/charts/peer-bar";
import { MetricCard } from "@/components/ui/metric-card";
import type { Fundamentals } from "@/lib/market-data/types";

interface Props {
  fundamentals: Fundamentals | null;
}

/**
 * Approximate sector medians for visual context only. Static values until
 * a peer-comparison API is wired in Phase 6.
 */
const SECTOR_MEDIAN = {
  peTrailing: 22,
  pegRatio: 1.5,
  pbRatio: 3.0,
  psRatio: 2.5,
  evToEbitda: 12,
  evToRevenue: 3,
};

function pct(v: number | null | undefined): number | null {
  return v == null ? null : v * 100;
}

export function ValuationTab({ fundamentals }: Props) {
  if (!fundamentals) return null;
  const v = fundamentals.valuation;
  const d = fundamentals.dividend;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Peer comparison bars */}
      <div className="glass flex flex-col gap-3 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground">Valuation vs sector median</h3>
        <div className="space-y-3">
          <PeerBar
            label="P/E (TTM)"
            value={v.peTrailing ?? 0}
            median={SECTOR_MEDIAN.peTrailing}
            max={60}
          />
          <PeerBar
            label="PEG"
            value={v.pegRatio ?? 0}
            median={SECTOR_MEDIAN.pegRatio}
            max={5}
          />
          <PeerBar
            label="P/B"
            value={v.pbRatio ?? 0}
            median={SECTOR_MEDIAN.pbRatio}
            max={15}
          />
          <PeerBar
            label="P/S"
            value={v.psRatio ?? 0}
            median={SECTOR_MEDIAN.psRatio}
            max={12}
          />
          <PeerBar
            label="EV/EBITDA"
            value={v.evToEbitda ?? 0}
            median={SECTOR_MEDIAN.evToEbitda}
            max={40}
            format={(x) => `${x.toFixed(1)}x`}
          />
          <PeerBar
            label="EV/Rev"
            value={v.evToRevenue ?? 0}
            median={SECTOR_MEDIAN.evToRevenue}
            max={15}
            format={(x) => `${x.toFixed(1)}x`}
          />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Sector medians are approximate; peer-comparison API coming in Phase 6.
        </p>
      </div>

      {/* Dividend + ratio cards */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          index={0}
          label="Dividend Yield"
          value={pct(d.yield)}
          format={(x) => `${x.toFixed(2)}%`}
          tone={d.yield != null && d.yield > 0.03 ? "bull" : "default"}
        />
        <MetricCard
          index={1}
          label="Payout Ratio"
          value={pct(d.payoutRatio)}
          format={(x) => `${x.toFixed(1)}%`}
          tone={
            d.payoutRatio == null
              ? "default"
              : d.payoutRatio > 0.8
                ? "bear"
                : d.payoutRatio > 0.5
                  ? "neutral"
                  : "bull"
          }
        />
        <MetricCard
          index={2}
          label="Trailing P/E"
          value={v.peTrailing}
          format={(x) => x.toFixed(2)}
        />
        <MetricCard
          index={3}
          label="Forward P/E"
          value={v.peForward}
          format={(x) => x.toFixed(2)}
          hint="Estimates"
        />
        <MetricCard
          index={4}
          label="P/B"
          value={v.pbRatio}
          format={(x) => x.toFixed(2)}
        />
        <MetricCard
          index={5}
          label="P/S"
          value={v.psRatio}
          format={(x) => x.toFixed(2)}
        />
      </div>
    </div>
  );
}
