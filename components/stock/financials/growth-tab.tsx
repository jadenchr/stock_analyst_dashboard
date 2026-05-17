"use client";

import { MetricCard } from "@/components/ui/metric-card";
import { MiniSparkline } from "@/components/ui/mini-sparkline";
import type { Financials } from "@/lib/api/client";
import type { Fundamentals } from "@/lib/market-data/types";

interface Props {
  financials: Financials | null;
  fundamentals: Fundamentals | null;
}

/**
 * Compute compound annual growth rate (CAGR) between first and last value.
 * Returns percent as a plain number, not 0..1.
 */
function cagr(first: number | null, last: number | null, years: number): number | null {
  if (first == null || last == null || first <= 0 || years <= 0) return null;
  return (Math.pow(last / first, 1 / years) - 1) * 100;
}

export function GrowthTab({ financials, fundamentals }: Props) {
  if (!financials) return null;
  const annual = financials.income.annual;
  if (annual.length === 0) return null;

  // Yahoo returns newest first; index 0 = most recent
  const newest = annual[0];
  const series = [...annual].reverse(); // oldest → newest

  const revenues = series
    .map((r) => r.revenue)
    .filter((v): v is number => v != null);
  const netIncomes = series
    .map((r) => r.netIncome)
    .filter((v): v is number => v != null);

  const cagr1y = cagr(annual[1]?.revenue ?? null, newest.revenue, 1);
  const cagr3y = cagr(annual[3]?.revenue ?? null, newest.revenue, 3);
  const cagr5y = cagr(annual[Math.min(4, annual.length - 1)]?.revenue ?? null, newest.revenue, Math.min(4, annual.length - 1) > 0 ? Math.min(4, annual.length - 1) : 0);

  const niCagr1y = cagr(annual[1]?.netIncome ?? null, newest.netIncome, 1);
  const niCagr3y = cagr(annual[3]?.netIncome ?? null, newest.netIncome, 3);
  const niCagr5y = cagr(annual[Math.min(4, annual.length - 1)]?.netIncome ?? null, newest.netIncome, Math.min(4, annual.length - 1) > 0 ? Math.min(4, annual.length - 1) : 0);

  const toneFor = (v: number | null) =>
    v == null ? ("default" as const) : v > 5 ? ("bull" as const) : v < 0 ? ("bear" as const) : ("neutral" as const);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GrowthCard
          title="Revenue growth"
          values={revenues}
          oneY={cagr1y}
          threeY={cagr3y}
          fiveY={cagr5y}
        />
        <GrowthCard
          title="Net income growth"
          values={netIncomes}
          oneY={niCagr1y}
          threeY={niCagr3y}
          fiveY={niCagr5y}
        />
      </div>

      {fundamentals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <MetricCard
            index={0}
            label="ROE"
            value={fundamentals.profitability.returnOnEquity != null ? fundamentals.profitability.returnOnEquity * 100 : null}
            format={(x) => `${x.toFixed(1)}%`}
            tone={toneFor(fundamentals.profitability.returnOnEquity != null ? fundamentals.profitability.returnOnEquity * 100 : null)}
          />
          <MetricCard
            index={1}
            label="ROA"
            value={fundamentals.profitability.returnOnAssets != null ? fundamentals.profitability.returnOnAssets * 100 : null}
            format={(x) => `${x.toFixed(1)}%`}
            tone={toneFor(fundamentals.profitability.returnOnAssets != null ? fundamentals.profitability.returnOnAssets * 100 : null)}
          />
          <MetricCard
            index={2}
            label="Earnings growth"
            value={fundamentals.growth.earningsGrowth != null ? fundamentals.growth.earningsGrowth * 100 : null}
            format={(x) => `${x.toFixed(1)}%`}
            tone={toneFor(fundamentals.growth.earningsGrowth != null ? fundamentals.growth.earningsGrowth * 100 : null)}
          />
          <MetricCard
            index={3}
            label="Revenue growth"
            value={fundamentals.growth.revenueGrowth != null ? fundamentals.growth.revenueGrowth * 100 : null}
            format={(x) => `${x.toFixed(1)}%`}
            tone={toneFor(fundamentals.growth.revenueGrowth != null ? fundamentals.growth.revenueGrowth * 100 : null)}
          />
        </div>
      )}
    </div>
  );
}

function GrowthCard({
  title,
  values,
  oneY,
  threeY,
  fiveY,
}: {
  title: string;
  values: number[];
  oneY: number | null;
  threeY: number | null;
  fiveY: number | null;
}) {
  const tone = (v: number | null) => (v == null ? "neutral" : v > 0 ? "bull" : "bear");
  return (
    <div className="glass flex flex-col gap-4 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <MiniSparkline values={values} className="h-8 w-32" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <GrowthStat label="1Y CAGR" value={oneY} tone={tone(oneY)} />
        <GrowthStat label="3Y CAGR" value={threeY} tone={tone(threeY)} />
        <GrowthStat label="5Y CAGR" value={fiveY} tone={tone(fiveY)} />
      </div>
    </div>
  );
}

function GrowthStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: "bull" | "bear" | "neutral";
}) {
  const color = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "text-muted-foreground";
  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-2.5">
      <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-base font-semibold tabular-nums ${color}`}>
        {value == null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`}
      </p>
    </div>
  );
}
