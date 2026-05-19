"use client";

import dynamic from "next/dynamic";
import { LineChart, Loader2 } from "lucide-react";
import { toTradingViewSymbol } from "@/lib/utils/tradingview-symbol";

const TradingViewWidget = dynamic(
  () => import("@/components/charts/tradingview-widget").then((m) => m.TradingViewWidget),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[600px] items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      </div>
    ),
  },
);

interface Props {
  /** Internal symbol (AAPL, RELIANCE.BO, JKH.N0000, BTC-USD, ^GSPC, etc.) */
  symbol: string;
  /** Yahoo's exchange string from the quote — disambiguates NYSE vs NASDAQ. */
  exchange?: string;
  /** Pixel height. Defaults to 600 — tall enough to read indicators. */
  height?: number;
}

/**
 * Universal chart section. Wraps the TradingView Advanced Chart widget
 * with a header that shows the resolved TV symbol so users can verify
 * they're looking at the right instrument.
 *
 * Replaces the previous Lightweight-Charts-based `PriceChart`, which
 * only worked for tickers Yahoo's historical endpoint could resolve.
 * The Advanced Chart widget handles every exchange we care about (US,
 * NSE, BSE, LSE, CSE, crypto, indices) and brings TradingView's full
 * indicator + drawing toolset for free.
 */
export function PriceChartSection({ symbol, exchange, height = 600 }: Props) {
  const tvSymbol = toTradingViewSymbol(symbol, exchange);

  return (
    <section aria-label="Historical chart" className="glass overflow-hidden rounded-2xl p-3">
      <header className="mb-3 flex items-center justify-between px-2 pt-1">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <LineChart className="h-3.5 w-3.5 text-primary" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Historical chart</h2>
            <p className="text-[11px] text-muted-foreground">
              TradingView Advanced Chart · all indicators + drawing tools included
            </p>
          </div>
        </div>
        <span className="hint-chip">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {tvSymbol}
        </span>
      </header>
      <TradingViewWidget symbol={tvSymbol} interval="1D" height={height} />
    </section>
  );
}
