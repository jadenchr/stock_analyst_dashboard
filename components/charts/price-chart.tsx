"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useHistorical } from "@/lib/api/client";
import {
  HISTORICAL_RANGES,
  type HistoricalRange,
} from "@/lib/market-data/types";
import type { ChartType, OverlayId } from "./price-chart-canvas";
import { cn } from "@/lib/utils";

// Heavy module — only loaded client-side after the page mounts.
const PriceChartCanvas = dynamic(() => import("./price-chart-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
    </div>
  ),
});

interface Props {
  symbol: string;
}

const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: "candlestick", label: "Candle" },
  { id: "line", label: "Line" },
  { id: "area", label: "Area" },
];

const OVERLAYS: { id: OverlayId; label: string }[] = [
  { id: "SMA20", label: "SMA 20" },
  { id: "SMA50", label: "SMA 50" },
  { id: "SMA200", label: "SMA 200" },
  { id: "EMA12", label: "EMA 12" },
  { id: "EMA26", label: "EMA 26" },
  { id: "BB", label: "Bollinger" },
];

const DEFAULT_RANGE: HistoricalRange = "1Y";

export function PriceChart({ symbol }: Props) {
  const [range, setRange] = useState<HistoricalRange>(DEFAULT_RANGE);
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [overlays, setOverlays] = useState<Set<OverlayId>>(new Set(["SMA50"]));
  const [showVolume, setShowVolume] = useState(true);

  const { data, isLoading, isError, refetch, isFetching } = useHistorical(symbol, range);

  function toggleOverlay(id: OverlayId) {
    setOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section
      aria-label="Price chart"
      className="glass overflow-hidden rounded-2xl"
    >
      {/* Controls bar */}
      <div className="flex flex-col gap-3 border-b border-border/60 p-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Range pills */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/70 bg-card/60 p-0.5">
          {HISTORICAL_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "cursor-pointer rounded-md px-2 py-1 font-mono text-[11px] font-semibold transition-all duration-150",
                r === range
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
              aria-pressed={r === range}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Chart type + volume + overlays */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-card/60 p-0.5">
            {CHART_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setChartType(t.id)}
                className={cn(
                  "cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium transition-colors duration-150",
                  t.id === chartType
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
                aria-pressed={t.id === chartType}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowVolume((v) => !v)}
            className={cn(
              "cursor-pointer rounded-md border px-2 py-1 text-[11px] font-medium transition-all duration-150",
              showVolume
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground",
            )}
            aria-pressed={showVolume}
          >
            Vol
          </button>

          <div className="hidden h-4 w-px bg-border/60 lg:block" aria-hidden />

          <div className="flex flex-wrap items-center gap-1">
            {OVERLAYS.map((o) => {
              const active = overlays.has(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggleOverlay(o.id)}
                  className={cn(
                    "cursor-pointer rounded-md border px-2 py-1 text-[11px] font-medium transition-all duration-150",
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                  aria-pressed={active}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart canvas area */}
      <div className="relative h-[440px] w-full">
        {data && data.length > 0 ? (
          // Show data when present, even during background refetches or errors
          <PriceChartCanvas
            data={data}
            chartType={chartType}
            overlays={overlays}
            showVolume={showVolume}
            watermark={symbol}
          />
        ) : isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
            <p className="text-sm">Couldn&rsquo;t load chart data</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-md border border-border/70 bg-card/60 px-2 py-1 text-xs hover:bg-card"
            >
              Try again
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No price history available
          </div>
        )}

        {isFetching && data && data.length > 0 && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-border/70 bg-card/80 px-2 py-0.5 text-[10px] text-muted-foreground backdrop-blur">
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden />
              updating
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
