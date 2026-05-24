import "server-only";
import { z } from "zod";
import { safeFetch } from "@/lib/security/allowlist";
import { ProviderError, TickerNotFoundError } from "./errors";
import type { Quote, SearchResult } from "./types";

/**
 * Colombo Stock Exchange (CSE) adapter.
 *
 * CSE does not publish an official API. We use the public AJAX endpoints
 * that power https://www.cse.lk - they are unauthenticated and stable
 * enough for read-only equity data. Everything here is wrapped in a typed
 * Zod schema and defensive try/catch: if CSE changes the contract, the
 * facade falls through to a graceful "data unavailable" response instead
 * of crashing the UI.
 *
 * Coverage:
 *   • quote(symbol)   → price, change, market cap, day range
 *   • search(query)   → ticker autocomplete
 *   • marketStatus()  → ASPI + S&P SL20 index values + open/closed
 *
 * NOT covered (would require paid feed):
 *   • Fundamentals, financial statements, historical OHLCV beyond today,
 *     insider transactions, analyst ratings.
 */

const PROVIDER = "cse";
const BASE = "https://www.cse.lk";

/* ---------------------------------------------------------------- helpers */

async function csePost<T>(path: string, body: Record<string, string>): Promise<T> {
  const form = new URLSearchParams(body);
  const res = await safeFetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form.toString(),
    timeoutMs: 10_000,
  });
  if (!res.ok) throw new ProviderError(PROVIDER, `HTTP ${res.status}`, 502);
  return (await res.json()) as T;
}

async function cseGet<T>(path: string): Promise<T> {
  const res = await safeFetch(`${BASE}${path}`, {
    headers: { Accept: "application/json" },
    timeoutMs: 10_000,
  });
  if (!res.ok) throw new ProviderError(PROVIDER, `HTTP ${res.status}`, 502);
  return (await res.json()) as T;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/,/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/* ------------------------------------------------------------------ quote */

const CseQuoteSchema = z
  .object({
    reqSymbolInfo: z
      .object({
        symbol: z.string().optional(),
        name: z.string().optional(),
        lastTradedPrice: z.number().nullable().optional(),
        previousClose: z.number().nullable().optional(),
        change: z.number().nullable().optional(),
        changePercentage: z.number().nullable().optional(),
        high: z.number().nullable().optional(),
        low: z.number().nullable().optional(),
        marketCap: z.number().nullable().optional(),
        tradeVolume: z.number().nullable().optional(),
        hiTrade: z.number().nullable().optional(),
        loTrade: z.number().nullable().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export async function getQuote(symbol: string): Promise<Quote> {
  let raw: unknown;
  try {
    raw = await csePost("/api/companyInfoSummery", { symbol });
  } catch (err) {
    throw new ProviderError(PROVIDER, `quote failed: ${(err as Error).message}`);
  }

  const parsed = CseQuoteSchema.safeParse(raw);
  const info = parsed.success ? parsed.data.reqSymbolInfo : undefined;
  if (!info || !info.symbol) throw new TickerNotFoundError(symbol);

  const price = num(info.lastTradedPrice);
  const prev = num(info.previousClose);
  if (price == null) throw new ProviderError(PROVIDER, "Quote missing price data");

  const change = num(info.change) ?? (prev != null ? price - prev : 0);
  const changePercent =
    num(info.changePercentage) ?? (prev != null && prev !== 0 ? ((price - prev) / prev) * 100 : 0);

  return {
    symbol,
    name: String(info.name ?? symbol),
    exchange: "Colombo Stock Exchange",
    currency: "LKR",
    price,
    previousClose: prev ?? price,
    change,
    changePercent,
    dayHigh: num(info.hiTrade) ?? num(info.high),
    dayLow: num(info.loTrade) ?? num(info.low),
    yearHigh: null,
    yearLow: null,
    volume: num(info.tradeVolume),
    avgVolume: null,
    marketCap: num(info.marketCap),
    peRatio: null,
    forwardPe: null,
    eps: null,
    dividendYield: null,
    beta: null,
    marketState: "CLOSED", // CSE provides no realtime state flag in this endpoint
    updatedAt: new Date().toISOString(),
  };
}

/* ----------------------------------------------------------------- search */

const CseSearchSchema = z.array(
  z
    .object({
      symbol: z.string(),
      name: z.string(),
      logoPath: z.string().nullable().optional(),
    })
    .passthrough(),
);

export async function search(query: string): Promise<SearchResult[]> {
  let raw: unknown;
  try {
    raw = await csePost("/api/companySearch", { q: query });
  } catch (err) {
    throw new ProviderError(PROVIDER, `search failed: ${(err as Error).message}`);
  }
  const parsed = CseSearchSchema.safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data.slice(0, 8).map<SearchResult>((c) => ({
    symbol: c.symbol,
    name: c.name,
    exchange: "CSE",
    type: "EQUITY",
  }));
}

/* ---------------------------------------------------------------- indices */

const CseMarketStatusSchema = z
  .object({
    aspi: z.object({ price: z.number(), priceChange: z.number(), changePercent: z.number() }).optional(),
    sAndp20: z.object({ price: z.number(), priceChange: z.number(), changePercent: z.number() }).optional(),
    status: z.string().optional(),
  })
  .passthrough();

export interface CseIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

export async function getMarketIndices(): Promise<CseIndex[]> {
  let raw: unknown;
  try {
    raw = await cseGet("/api/marketStatus");
  } catch (err) {
    throw new ProviderError(PROVIDER, `marketStatus failed: ${(err as Error).message}`);
  }
  const parsed = CseMarketStatusSchema.safeParse(raw);
  if (!parsed.success) return [];
  const out: CseIndex[] = [];
  if (parsed.data.aspi) {
    out.push({
      symbol: "ASPI",
      name: "CSE ASPI",
      value: parsed.data.aspi.price,
      change: parsed.data.aspi.priceChange,
      changePercent: parsed.data.aspi.changePercent,
    });
  }
  if (parsed.data.sAndp20) {
    out.push({
      symbol: "SP-SL20",
      name: "S&P SL20",
      value: parsed.data.sAndp20.price,
      change: parsed.data.sAndp20.priceChange,
      changePercent: parsed.data.sAndp20.changePercent,
    });
  }
  return out;
}

/* ----------------------------------------------------- curated tickers --- */

/**
 * Curated set of CSE blue-chips used to seed search suggestions and the
 * regional home-page section. Reduces dependency on CSE's search endpoint
 * which can be flaky.
 */
export const CSE_FEATURED: ReadonlyArray<{ symbol: string; name: string }> = [
  { symbol: "JKH.N0000", name: "John Keells Holdings PLC" },
  { symbol: "COMB.N0000", name: "Commercial Bank of Ceylon PLC" },
  { symbol: "HNB.N0000", name: "Hatton National Bank PLC" },
  { symbol: "SAMP.N0000", name: "Sampath Bank PLC" },
  { symbol: "DIAL.N0000", name: "Dialog Axiata PLC" },
  { symbol: "LOLC.N0000", name: "LOLC Holdings PLC" },
  { symbol: "HAYL.N0000", name: "Hayleys PLC" },
  { symbol: "LION.N0000", name: "Lion Brewery (Ceylon) PLC" },
  { symbol: "MELS.N0000", name: "Melstacorp PLC" },
  { symbol: "CTC.N0000", name: "Ceylon Tobacco Company PLC" },
];
