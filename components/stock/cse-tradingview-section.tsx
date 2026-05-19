"use client";

import dynamic from "next/dynamic";
import { LineChart, Loader2 } from "lucide-react";

// TradingView script tag must be appended client-side, never SSR'd
const TradingViewWidget = dynamic(
  () => import("@/components/charts/tradingview-widget").then((m) => m.TradingViewWidget),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[440px] items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      </div>
    ),
  },
);

interface Props {
  /** Internal symbol like `JKH.N0000` — we translate to TradingView's `CSELK:JKH.N0000`. */
  symbol: string;
}

/**
 * Wraps the TradingView Advanced Chart widget on CSE stock pages.
 * Translates our internal `JKH.N0000` style symbol into TradingView's
 * `CSELK:JKH.N0000` namespace so their feed can resolve it.
 */
export function CseTradingViewSection({ symbol }: Props) {
  const tvSymbol = `CSELK:${symbol}`;

  return (
    <section
      aria-label="TradingView chart"
      className="glass overflow-hidden rounded-2xl p-3"
    >
      <header className="mb-3 flex items-center justify-between px-2 pt-1">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <LineChart className="h-3.5 w-3.5 text-primary" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Historical chart</h2>
            <p className="text-[11px] text-muted-foreground">
              Powered by TradingView · the cse.lk feed doesn&rsquo;t expose history publicly
            </p>
          </div>
        </div>
        <span className="hint-chip">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {tvSymbol}
        </span>
      </header>
      <TradingViewWidget symbol={tvSymbol} interval="1D" height={440} />
    </section>
  );
}
