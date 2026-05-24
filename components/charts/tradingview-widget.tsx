"use client";

import { useEffect, useRef } from "react";

interface Props {
  /**
   * TradingView-style symbol - e.g. `CSELK:JKH.N0000` for Colombo,
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

      // Full chrome - match TradingView's stand-alone Chart page as
      // closely as the embed widget allows.
      enable_publishing: true,         // top-right "Publish" button
      withdateranges: true,            // bottom date-range bar
      hide_top_toolbar: false,         // top symbol / interval / indicators bar
      hide_side_toolbar: false,        // LEFT drawing-tools toolbar
      hide_legend: false,              // OHLC legend at top-left of chart
      hide_volume: false,              // volume sub-pane
      allow_symbol_change: true,       // search a different symbol from the chart
      save_image: true,                // top-right camera icon
      show_popup_button: true,         // pop the chart out into its own window
      popup_width: "1400",
      popup_height: "900",

      // Right side-panel - Watchlist + Details + News tabs
      details: true,
      hotlist: true,
      calendar: true,
      news: ["headlines"],
      watchlist: [
        "FOREXCOM:SPXUSD",
        "FOREXCOM:NSXUSD",
        "FOREXCOM:DJI",
        "TVC:VIX",
        "TVC:DXY",
        "NASDAQ:AAPL",
        "NASDAQ:NVDA",
        "NASDAQ:TSLA",
        "NASDAQ:META",
        "NASDAQ:MSFT",
      ],

      // Pre-loaded studies - light-touch defaults that match what most
      // users want when they open a stock for the first time.
      studies: ["MASimple@tv-basicstudies", "Volume@tv-basicstudies"],

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
      // CSS variable + descendant selector forces every child
      // (TradingView's auto-injected iframe + its wrapper divs) to
      // expand to the requested height. TV's embed script sometimes
      // ignores the parent's height when `autosize: true` is on and
      // the iframe boots before the React style is committed - this
      // guarantees the chart fills the box once it's there.
      className="tradingview-widget-container [&>*]:!h-full [&_iframe]:!h-full"
      style={
        {
          ["--tv-h" as string]: `${height}px`,
          height,
          minHeight: height,
          width: "100%",
        } as React.CSSProperties
      }
    />
  );
}
