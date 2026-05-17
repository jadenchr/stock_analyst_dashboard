"use client";

import { useEffect, useRef } from "react";
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { HistoricalPoint } from "@/lib/market-data/types";
import { bollinger, ema, sma } from "@/lib/utils/indicators";

export type ChartType = "line" | "candlestick" | "area";

export type OverlayId =
  | "SMA20"
  | "SMA50"
  | "SMA200"
  | "EMA12"
  | "EMA26"
  | "BB";

interface Props {
  data: HistoricalPoint[];
  chartType: ChartType;
  overlays: ReadonlySet<OverlayId>;
  showVolume: boolean;
  watermark?: string;
}

const COLORS = {
  bg: "transparent",
  text: "rgba(228, 230, 235, 0.6)",
  grid: "rgba(255, 255, 255, 0.04)",
  bull: "#00FFB2",
  bear: "#FF3B5C",
  line: "#00D4FF",
  area: "#00D4FF",
  // Overlay palette (consistent hues, distinguishable)
  sma20: "#FFD166",
  sma50: "#FF8FAA",
  sma200: "#B49EFF",
  ema12: "#7DF4D0",
  ema26: "#F7B267",
  bb: "rgba(0, 212, 255, 0.45)",
};

function toUnix(iso: string): Time {
  // lightweight-charts accepts unix seconds for intraday-style charts
  return Math.floor(new Date(iso).getTime() / 1000) as Time;
}

export default function PriceChartCanvas({
  data,
  chartType,
  overlays,
  showVolume,
  watermark,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: COLORS.bg },
        textColor: COLORS.text,
        fontFamily:
          "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.06)",
        scaleMargins: { top: 0.08, bottom: showVolume ? 0.28 : 0.08 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: "rgba(255,255,255,0.18)", width: 1, style: LineStyle.Dotted },
        horzLine: { color: "rgba(255,255,255,0.18)", width: 1, style: LineStyle.Dotted },
      },
      watermark: watermark
        ? {
            visible: true,
            color: "rgba(255,255,255,0.04)",
            text: watermark,
            fontSize: 64,
            fontFamily: "'DM Serif Display', serif",
          }
        : { visible: false },
      width: el.clientWidth,
      height: el.clientHeight,
      autoSize: false,
    });

    chartRef.current = chart;

    // ----- Main price series ---------------------------------------------
    let mainSeries:
      | ISeriesApi<"Candlestick">
      | ISeriesApi<"Line">
      | ISeriesApi<"Area">;

    if (chartType === "candlestick") {
      mainSeries = chart.addCandlestickSeries({
        upColor: COLORS.bull,
        downColor: COLORS.bear,
        borderVisible: false,
        wickUpColor: COLORS.bull,
        wickDownColor: COLORS.bear,
        priceLineVisible: true,
        priceLineColor: "rgba(255,255,255,0.2)",
        priceLineStyle: LineStyle.Dashed,
      });
      const candleData = data.map((d) => ({
        time: toUnix(d.date),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));
      mainSeries.setData(candleData);
    } else if (chartType === "area") {
      mainSeries = chart.addAreaSeries({
        lineColor: COLORS.area,
        topColor: "rgba(0, 212, 255, 0.35)",
        bottomColor: "rgba(0, 212, 255, 0.02)",
        lineWidth: 2,
        priceLineVisible: true,
        priceLineColor: "rgba(255,255,255,0.2)",
        priceLineStyle: LineStyle.Dashed,
      });
      mainSeries.setData(data.map((d) => ({ time: toUnix(d.date), value: d.close })));
    } else {
      mainSeries = chart.addLineSeries({
        color: COLORS.line,
        lineWidth: 2,
        priceLineVisible: true,
        priceLineColor: "rgba(255,255,255,0.2)",
        priceLineStyle: LineStyle.Dashed,
      });
      mainSeries.setData(data.map((d) => ({ time: toUnix(d.date), value: d.close })));
    }

    // ----- Volume sub-series ---------------------------------------------
    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: "rgba(0, 212, 255, 0.4)",
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });
      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.78, bottom: 0 },
      });
      volumeSeries.setData(
        data.map((d) => ({
          time: toUnix(d.date),
          value: d.volume,
          color:
            d.close >= d.open
              ? "rgba(0, 255, 178, 0.5)"
              : "rgba(255, 59, 92, 0.5)",
        })),
      );
    }

    // ----- Overlay indicators --------------------------------------------
    const closes = data.map((d) => d.close);
    const baseTimes = data.map((d) => toUnix(d.date));
    const overlaySpec: Array<{
      id: OverlayId;
      values: (number | null)[];
      color: string;
    }> = [];

    if (overlays.has("SMA20")) overlaySpec.push({ id: "SMA20", values: sma(closes, 20), color: COLORS.sma20 });
    if (overlays.has("SMA50")) overlaySpec.push({ id: "SMA50", values: sma(closes, 50), color: COLORS.sma50 });
    if (overlays.has("SMA200")) overlaySpec.push({ id: "SMA200", values: sma(closes, 200), color: COLORS.sma200 });
    if (overlays.has("EMA12")) overlaySpec.push({ id: "EMA12", values: ema(closes, 12), color: COLORS.ema12 });
    if (overlays.has("EMA26")) overlaySpec.push({ id: "EMA26", values: ema(closes, 26), color: COLORS.ema26 });

    for (const o of overlaySpec) {
      const series = chart.addLineSeries({
        color: o.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      series.setData(
        o.values
          .map((v, i) => (v == null ? null : { time: baseTimes[i], value: v }))
          .filter((p): p is { time: Time; value: number } => p !== null),
      );
    }

    if (overlays.has("BB")) {
      const { upper, mid, lower } = bollinger(closes, 20, 2);
      const upperSeries = chart.addLineSeries({
        color: COLORS.bb,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      const lowerSeries = chart.addLineSeries({
        color: COLORS.bb,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      const midSeries = chart.addLineSeries({
        color: "rgba(0, 212, 255, 0.25)",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      const toSeries = (vals: (number | null)[]) =>
        vals
          .map((v, i) => (v == null ? null : { time: baseTimes[i], value: v }))
          .filter((p): p is { time: Time; value: number } => p !== null);
      upperSeries.setData(toSeries(upper));
      lowerSeries.setData(toSeries(lower));
      midSeries.setData(toSeries(mid));
    }

    chart.timeScale().fitContent();

    // ----- Responsive resize ---------------------------------------------
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, chartType, overlays, showVolume, watermark]);

  return <div ref={containerRef} className="h-full w-full" />;
}
