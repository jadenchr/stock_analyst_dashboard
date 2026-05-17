import "server-only";
import { z } from "zod";
import { safeFetch } from "@/lib/security/allowlist";
import { ProviderError } from "./errors";

const PROVIDER = "alpha-vantage";
const BASE = "https://www.alphavantage.co/query";

function getKey(): string {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) throw new ProviderError(PROVIDER, "ALPHA_VANTAGE_API_KEY is not set", 503);
  return key;
}

/* ----------------------------------- common Alpha Vantage response wrappers */

const ErrorWrapperSchema = z
  .object({
    Note: z.string().optional(),
    Information: z.string().optional(),
    "Error Message": z.string().optional(),
  })
  .passthrough();

function assertNotThrottled(payload: unknown): void {
  const e = ErrorWrapperSchema.safeParse(payload);
  if (!e.success) return;
  const { Note, Information, "Error Message": err } = e.data;
  if (Note) throw new ProviderError(PROVIDER, "Rate limited by Alpha Vantage", 429);
  if (Information) throw new ProviderError(PROVIDER, "Alpha Vantage info-throttled", 429);
  if (err) throw new ProviderError(PROVIDER, "Alpha Vantage rejected request", 502);
}

/* ----------------------------------- helpers ---------------------------- */

async function avFetch(params: Record<string, string>): Promise<unknown> {
  const url = new URL(BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", getKey());

  const res = await safeFetch(url, { timeoutMs: 12_000 });
  if (!res.ok) {
    throw new ProviderError(PROVIDER, `HTTP ${res.status}`, res.status >= 500 ? 502 : res.status);
  }
  const json: unknown = await res.json();
  assertNotThrottled(json);
  return json;
}

/* ----------------------------------- RSI -------------------------------- */

const RsiPointSchema = z.object({ RSI: z.string() });

export interface IndicatorPoint {
  date: string;
  value: number;
}

export async function getRSI(symbol: string, period = 14): Promise<IndicatorPoint[]> {
  const json = (await avFetch({
    function: "RSI",
    symbol,
    interval: "daily",
    time_period: String(period),
    series_type: "close",
  })) as Record<string, unknown>;

  const series = json["Technical Analysis: RSI"];
  if (!series || typeof series !== "object") return [];
  return Object.entries(series as Record<string, unknown>)
    .map(([date, raw]) => {
      const parsed = RsiPointSchema.safeParse(raw);
      if (!parsed.success) return null;
      const value = Number(parsed.data.RSI);
      return Number.isFinite(value) ? { date, value } : null;
    })
    .filter((p): p is IndicatorPoint => p !== null)
    .slice(0, 200);
}

/* ----------------------------------- MACD ------------------------------- */

const MacdPointSchema = z.object({
  MACD: z.string(),
  MACD_Signal: z.string(),
  MACD_Hist: z.string(),
});

export interface MacdPoint {
  date: string;
  macd: number;
  signal: number;
  histogram: number;
}

export async function getMACD(symbol: string): Promise<MacdPoint[]> {
  const json = (await avFetch({
    function: "MACD",
    symbol,
    interval: "daily",
    series_type: "close",
  })) as Record<string, unknown>;

  const series = json["Technical Analysis: MACD"];
  if (!series || typeof series !== "object") return [];
  return Object.entries(series as Record<string, unknown>)
    .map(([date, raw]) => {
      const parsed = MacdPointSchema.safeParse(raw);
      if (!parsed.success) return null;
      const macd = Number(parsed.data.MACD);
      const signal = Number(parsed.data.MACD_Signal);
      const histogram = Number(parsed.data.MACD_Hist);
      if (![macd, signal, histogram].every(Number.isFinite)) return null;
      return { date, macd, signal, histogram };
    })
    .filter((p): p is MacdPoint => p !== null)
    .slice(0, 200);
}

/* ----------------------------------- SMA / EMA -------------------------- */

const MovingAvgSchema = z.object({ SMA: z.string().optional(), EMA: z.string().optional() });

async function getMovingAverage(
  symbol: string,
  type: "SMA" | "EMA",
  period: number,
): Promise<IndicatorPoint[]> {
  const json = (await avFetch({
    function: type,
    symbol,
    interval: "daily",
    time_period: String(period),
    series_type: "close",
  })) as Record<string, unknown>;

  const key = `Technical Analysis: ${type}`;
  const series = json[key];
  if (!series || typeof series !== "object") return [];

  return Object.entries(series as Record<string, unknown>)
    .map(([date, raw]) => {
      const parsed = MovingAvgSchema.safeParse(raw);
      if (!parsed.success) return null;
      const value = Number(parsed.data[type]);
      return Number.isFinite(value) ? { date, value } : null;
    })
    .filter((p): p is IndicatorPoint => p !== null)
    .slice(0, 200);
}

export const getSMA = (symbol: string, period: number) => getMovingAverage(symbol, "SMA", period);
export const getEMA = (symbol: string, period: number) => getMovingAverage(symbol, "EMA", period);
