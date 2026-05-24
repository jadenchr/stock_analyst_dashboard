import "server-only";
import { cached, cacheKey, TTL } from "@/lib/cache";
import { classifyTicker } from "@/lib/utils/validators";
import * as yahoo from "./yahoo";
import * as finnhub from "./finnhub";
import * as newsapi from "./newsapi";
import * as av from "./alpha-vantage";
import * as cse from "./cse";
import { ProviderError } from "./errors";
import type {
  AnalystConsensus,
  Fundamentals,
  HistoricalPoint,
  HistoricalRange,
  InsiderTx,
  MarketIndex,
  NewsArticle,
  Quote,
  SearchResult,
} from "./types";

/**
 * Provider-agnostic facade. Route handlers MUST go through this module -
 * never import provider adapters directly.
 *
 * Routing strategy:
 *   • CSE tickers (Sri Lanka, `.N0000` style) → cse.lk public endpoints
 *   • Everything else (US, BSE `.BO`, NSE `.NS`, LSE, crypto) → Yahoo Finance
 *
 * Sub-domains:
 *   • Indicators        → Alpha Vantage
 *   • News              → Finnhub primary, NewsAPI fallback (US/EN tickers)
 *   • Insider / consensus → Finnhub
 */

function isCSE(symbol: string): boolean {
  return classifyTicker(symbol) === "LK_CSE";
}

/* ------------------------------------------------------------------ quote */

export async function quote(symbol: string): Promise<Quote> {
  return cached(cacheKey("quote", symbol), TTL.quote, () =>
    isCSE(symbol) ? cse.getQuote(symbol) : yahoo.getQuote(symbol),
  );
}

export async function quotes(symbols: string[]): Promise<Quote[]> {
  return Promise.all(symbols.map((s) => quote(s).catch(() => null))).then((rows) =>
    rows.filter((r): r is Quote => r !== null),
  );
}

/* ---------------------------------------------------------- fundamentals */

export async function fundamentals(symbol: string): Promise<Fundamentals> {
  if (isCSE(symbol)) {
    // CSE doesn't expose ratios via public endpoints
    throw new ProviderError("cse", "Fundamentals not available for CSE tickers", 501);
  }
  return cached(cacheKey("fundamentals", symbol), TTL.fundamentals, () =>
    yahoo.getFundamentals(symbol),
  );
}

export async function financials(symbol: string) {
  if (isCSE(symbol)) {
    throw new ProviderError("cse", "Financial statements not available for CSE tickers", 501);
  }
  return cached(cacheKey("financials", symbol), TTL.financials, () =>
    yahoo.getFinancials(symbol),
  );
}

/* ---------------------------------------------------------- historical */

export async function historical(
  symbol: string,
  range: HistoricalRange,
): Promise<HistoricalPoint[]> {
  if (isCSE(symbol)) {
    // CSE historical OHLCV requires a paid feed
    return [];
  }
  return cached(cacheKey("historical", symbol, range), TTL.historical, () =>
    yahoo.getHistorical(symbol, range),
  );
}

/* ---------------------------------------------------------- search */

/**
 * Unified search - fans out to both Yahoo and CSE, merges, deduplicates.
 * CSE results are appended at the end so US/IN/UK matches surface first
 * unless the query matches a CSE-curated name directly.
 */
export async function search(query: string): Promise<SearchResult[]> {
  return cached(cacheKey("search", query.toLowerCase()), TTL.search, async () => {
    const [yahooResults, cseResults] = await Promise.allSettled([
      yahoo.search(query),
      cse.search(query),
    ]);
    const out: SearchResult[] = [];
    const seen = new Set<string>();
    if (yahooResults.status === "fulfilled") {
      for (const r of yahooResults.value) {
        if (seen.has(r.symbol)) continue;
        seen.add(r.symbol);
        out.push(r);
      }
    }
    if (cseResults.status === "fulfilled") {
      for (const r of cseResults.value) {
        if (seen.has(r.symbol)) continue;
        seen.add(r.symbol);
        out.push(r);
      }
    }
    // Also surface curated CSE blue-chips when the query matches their name
    const q = query.trim().toUpperCase();
    for (const c of cse.CSE_FEATURED) {
      if (seen.has(c.symbol)) continue;
      if (c.symbol.startsWith(q) || c.name.toUpperCase().includes(q)) {
        out.push({ symbol: c.symbol, name: c.name, exchange: "CSE", type: "EQUITY" });
        seen.add(c.symbol);
      }
    }
    return out.slice(0, 12);
  });
}

/* ---------------------------------------------------------- market overview */

export async function marketIndices(): Promise<MarketIndex[]> {
  return cached(cacheKey("indices"), TTL.marketOverview, async () => {
    const [yahooIdx, cseIdx] = await Promise.allSettled([
      yahoo.getMarketIndices(),
      cse.getMarketIndices(),
    ]);
    const out: MarketIndex[] = [];
    if (yahooIdx.status === "fulfilled") out.push(...yahooIdx.value);
    if (cseIdx.status === "fulfilled") {
      for (const i of cseIdx.value) {
        out.push({
          symbol: i.symbol,
          name: i.name,
          value: i.value,
          change: i.change,
          changePercent: i.changePercent,
        });
      }
    }
    return out;
  });
}

export async function gainers() {
  return cached(cacheKey("gainers"), TTL.marketOverview, () => yahoo.getDailyGainers());
}

export async function losers() {
  return cached(cacheKey("losers"), TTL.marketOverview, () => yahoo.getDailyLosers());
}

export async function sectorPerformance() {
  return cached(cacheKey("sectors"), TTL.marketOverview, () => yahoo.getSectorPerformance());
}

export async function regionalHeatmap(
  region: "US" | "IN_NSE" | "IN_BSE" | "LK_CSE" | "CRYPTO",
) {
  return cached(cacheKey("heatmap", region), TTL.marketOverview, () =>
    yahoo.getRegionalHeatmap(region),
  );
}

export async function trendingBusinessNews(country: string = "us") {
  return cached(cacheKey("trending-news", country), TTL.news, () =>
    newsapi.topBusinessHeadlines({ country, pageSize: 24 }).catch(() => []),
  );
}

export type { ScreenerId, ScreenerResult } from "./yahoo";

export async function screener(id: yahoo.ScreenerId, count = 25) {
  return cached(cacheKey("screener", id, count), TTL.marketOverview, () =>
    yahoo.runScreener(id, count),
  );
}

/* ---------------------------------------------------------- news / insider */

export async function news(symbol: string, companyName?: string): Promise<NewsArticle[]> {
  return cached(cacheKey("news", symbol), TTL.news, async () => {
    // CSE: no per-company news endpoint available - fall straight to NewsAPI keyword search
    if (isCSE(symbol)) {
      const cleanedSymbol = symbol.split(".")[0];
      const q = companyName ? `${cleanedSymbol} ${companyName}` : cleanedSymbol;
      return newsapi.searchNews(q, 12).catch(() => []);
    }
    try {
      const primary = await finnhub.getCompanyNews(symbol);
      if (primary.length > 0) return primary;
    } catch (err) {
      if (!(err instanceof ProviderError)) throw err;
    }
    const q = companyName ? `${symbol} ${companyName}` : symbol;
    return newsapi.searchNews(q, 12).catch(() => []);
  });
}

export async function insiderTx(symbol: string): Promise<InsiderTx[]> {
  if (isCSE(symbol)) return [];
  return cached(cacheKey("insider", symbol), TTL.insider, () =>
    finnhub.getInsiderTx(symbol).catch(() => []),
  );
}

export async function analystConsensus(symbol: string): Promise<AnalystConsensus | null> {
  if (isCSE(symbol)) return null;
  return cached(cacheKey("consensus", symbol), TTL.fundamentals, () =>
    finnhub.getRecommendations(symbol).catch(() => null),
  );
}

export const technicals = {
  rsi: (symbol: string, period = 14) =>
    cached(cacheKey("rsi", symbol, period), TTL.historical, () => av.getRSI(symbol, period)),
  macd: (symbol: string) =>
    cached(cacheKey("macd", symbol), TTL.historical, () => av.getMACD(symbol)),
  sma: (symbol: string, period: number) =>
    cached(cacheKey("sma", symbol, period), TTL.historical, () => av.getSMA(symbol, period)),
  ema: (symbol: string, period: number) =>
    cached(cacheKey("ema", symbol, period), TTL.historical, () => av.getEMA(symbol, period)),
};

export { CSE_FEATURED } from "./cse";

export type {
  AnalystConsensus,
  Fundamentals,
  HistoricalPoint,
  HistoricalRange,
  InsiderTx,
  MarketIndex,
  NewsArticle,
  Quote,
  SearchResult,
};
