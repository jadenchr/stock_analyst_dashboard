"use client";

import { useEffect, useRef } from "react";

interface Props {
  /**
   * TradingView-style symbol — e.g. `CSELK:JKH.N0000` for Colombo,
   * `NSE:RELIANCE` for NSE, `NASDAQ:AAPL` for Apple. The component
   * doesn't validate; pass whatever the markets page accepts.
   */
  symbol: string;
  /** Default range. `1D` 5D 1M 3M 6M YTD 1Y 5Y ALL. */
  interval?: "1D" | "1W" | "1M";
  height?: number;
}

/**
 * TradingView Advanced Chart widget. We mount it lazily on the client
 * because the script is third-party and we don't want it in the SSR
 * payload. The widget script auto-instantiates by reading the inner
 * JSON config we serialize into a <script type="text/javascript">.
 *
 * Used today on CSE stock pages where our own TradingView Lightweight
 * Charts implementation can't reach the data feed.
 */
export function TradingViewWidget({ symbol, interval = "1D", height = 440 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Clear any prior widget on re-mount (symbol change)
    el.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      withdateranges: true,
      allow_symbol_change: false,
      backgroundColor: "rgba(0, 0, 0, 0)",
      gridColor: "rgba(180, 160, 220, 0.06)",
      support_host: "https://www.tradingview.com",
    });
    el.appendChild(script);

    return () => {
      el.innerHTML = "";
    };
  }, [symbol, interval]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height, width: "100%" }}
    />
  );
}
