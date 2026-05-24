import "server-only";
import YahooFinance from "yahoo-finance2";
import { ProviderError, TickerNotFoundError } from "./errors";
import {
  type Fundamentals,
  type HistoricalPoint,
  type HistoricalRange,
  type MarketIndex,
  type Quote,
  type SearchResult,
} from "./types";

/**
 * Single shared Yahoo Finance client. Notices ("yahooSurvey", "ripHistorical")
 * are suppressed to keep server logs clean - the data is still valid.
 */
const yf = new YahooFinance();
yf._notices.suppress(["yahooSurvey", "ripHistorical"]);

const PROVIDER = "yahoo";

/* ------------------------------------------------------------------ helpers */

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function rangeToPeriod1(range: HistoricalRange): Date {
  const now = new Date();
  const d = new Date(now);
  switch (range) {
    case "1D":
      d.setDate(now.getDate() - 1);
      break;
    case "5D":
      d.setDate(now.getDate() - 5);
      break;
    case "1M":
      d.setMonth(now.getMonth() - 1);
      break;
    case "3M":
      d.setMonth(now.getMonth() - 3);
      break;
    case "6M":
      d.setMonth(now.getMonth() - 6);
      break;
    case "1Y":
      d.setFullYear(now.getFullYear() - 1);
      break;
    case "2Y":
      d.setFullYear(now.getFullYear() - 2);
      break;
    case "5Y":
      d.setFullYear(now.getFullYear() - 5);
      break;
    case "MAX":
      d.setFullYear(1990);
      break;
  }
  return d;
}

function rangeInterval(range: HistoricalRange): "1d" | "1wk" | "1mo" {
  if (range === "5Y" || range === "MAX") return "1wk";
  if (range === "2Y") return "1wk";
  return "1d";
}

function marketState(raw: unknown): Quote["marketState"] {
  switch (raw) {
    case "PRE":
    case "PREPRE":
      return "PRE";
    case "POST":
    case "POSTPOST":
      return "POST";
    case "REGULAR":
      return "REGULAR";
    default:
      return "CLOSED";
  }
}

/* -------------------------------------------------------------------- quote */

export async function getQuote(symbol: string): Promise<Quote> {
  let raw: unknown;
  try {
    raw = await yf.quote(symbol);
  } catch (err) {
    throw new ProviderError(PROVIDER, `quote failed: ${(err as Error).message}`);
  }

  if (!raw || typeof raw !== "object" || !("symbol" in raw)) {
    throw new TickerNotFoundError(symbol);
  }

  const r = raw as Record<string, unknown>;
  const price = num(r.regularMarketPrice);
  const prev = num(r.regularMarketPreviousClose);
  if (price == null || prev == null) {
    throw new ProviderError(PROVIDER, "Quote missing price data");
  }

  return {
    symbol: String(r.symbol),
    name: String(r.longName ?? r.shortName ?? r.symbol),
    exchange: String(r.fullExchangeName ?? r.exchange ?? "-"),
    currency: String(r.currency ?? "USD"),
    price,
    previousClose: prev,
    open: num(r.regularMarketOpen),
    change: num(r.regularMarketChange) ?? price - prev,
    changePercent: num(r.regularMarketChangePercent) ?? ((price - prev) / prev) * 100,
    dayHigh: num(r.regularMarketDayHigh),
    dayLow: num(r.regularMarketDayLow),
    yearHigh: num(r.fiftyTwoWeekHigh),
    yearLow: num(r.fiftyTwoWeekLow),
    volume: num(r.regularMarketVolume),
    avgVolume: num(r.averageDailyVolume3Month),
    marketCap: num(r.marketCap),
    peRatio: num(r.trailingPE),
    forwardPe: num(r.forwardPE),
    eps: num(r.epsTrailingTwelveMonths),
    dividendYield: num(r.trailingAnnualDividendYield),
    beta: null, // populated by getFundamentals
    marketState: marketState(r.marketState),
    updatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------- multi-quote */

export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  const results = await Promise.allSettled(symbols.map(getQuote));
  return results
    .filter((r): r is PromiseFulfilledResult<Quote> => r.status === "fulfilled")
    .map((r) => r.value);
}

/* ----------------------------------------------------------------- search */

export async function search(query: string): Promise<SearchResult[]> {
  try {
    const raw = await yf.search(query, { quotesCount: 8, newsCount: 0 });
    const quotes = (raw?.quotes ?? []) as Array<Record<string, unknown>>;
    return quotes
      .filter((q) => typeof q.symbol === "string")
      .map<SearchResult>((q) => ({
        symbol: String(q.symbol),
        name: String(q.longname ?? q.shortname ?? q.symbol),
        exchange: String(q.exchDisp ?? q.exchange ?? "-"),
        type: String(q.quoteType ?? q.typeDisp ?? "EQUITY"),
      }));
  } catch (err) {
    throw new ProviderError(PROVIDER, `search failed: ${(err as Error).message}`);
  }
}

/* --------------------------------------------------------------- historical */

interface YahooChartQuote {
  date?: Date | string | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
}

export async function getHistorical(
  symbol: string,
  range: HistoricalRange,
): Promise<HistoricalPoint[]> {
  const period1 = rangeToPeriod1(range);
  const interval = rangeInterval(range);
  let rows: { quotes?: YahooChartQuote[] };
  try {
    rows = (await yf.chart(symbol, {
      period1,
      interval,
      includePrePost: false,
    })) as { quotes?: YahooChartQuote[] };
  } catch (err) {
    throw new ProviderError(PROVIDER, `historical failed: ${(err as Error).message}`);
  }

  const quotes = rows?.quotes ?? [];
  return quotes
    .filter((q): q is YahooChartQuote => q != null && q.close != null && q.date != null)
    .map<HistoricalPoint>((q) => ({
      date: q.date instanceof Date ? q.date.toISOString() : String(q.date),
      open: num(q.open) ?? num(q.close) ?? 0,
      high: num(q.high) ?? num(q.close) ?? 0,
      low: num(q.low) ?? num(q.close) ?? 0,
      close: num(q.close) ?? 0,
      volume: num(q.volume) ?? 0,
    }));
}

/* -------------------------------------------------------------- fundamentals */

export async function getFundamentals(symbol: string): Promise<Fundamentals> {
  let summary;
  try {
    summary = await yf.quoteSummary(symbol, {
      modules: [
        "summaryDetail",
        "financialData",
        "defaultKeyStatistics",
        "calendarEvents",
        "assetProfile",
      ],
    });
  } catch (err) {
    throw new ProviderError(PROVIDER, `fundamentals failed: ${(err as Error).message}`);
  }

  if (!summary) throw new TickerNotFoundError(symbol);

  const sd = (summary.summaryDetail ?? {}) as Record<string, unknown>;
  const fd = (summary.financialData ?? {}) as Record<string, unknown>;
  const ks = (summary.defaultKeyStatistics ?? {}) as Record<string, unknown>;
  const ap = (summary.assetProfile ?? {}) as Record<string, unknown>;

  // Pick a CEO from companyOfficers - prefer titles containing CEO/Chief Exec.
  const officers = (ap.companyOfficers as Array<Record<string, unknown>> | undefined) ?? [];
  const ceoMatch = officers.find((o) => {
    const t = typeof o.title === "string" ? o.title.toLowerCase() : "";
    return t.includes("ceo") || t.includes("chief executive");
  });
  const ceoName = ceoMatch && typeof ceoMatch.name === "string" ? ceoMatch.name : null;

  // First-trade date is in summaryDetail or defaultKeyStatistics as a Unix
  // timestamp (seconds). Convert to ISO and slice to YYYY-MM-DD.
  const firstTrade =
    (sd.firstTradeDateMilliseconds as number | undefined) ??
    ((ks.firstTradeDate as { raw?: number } | undefined)?.raw
      ? (ks.firstTradeDate as { raw: number }).raw * 1000
      : undefined);
  const ipoDate =
    typeof firstTrade === "number" && Number.isFinite(firstTrade)
      ? new Date(firstTrade).toISOString().slice(0, 10)
      : null;

  return {
    symbol,
    profile: {
      sector: typeof ap.sector === "string" ? ap.sector : null,
      industry: typeof ap.industry === "string" ? ap.industry : null,
      country: typeof ap.country === "string" ? ap.country : null,
      website: typeof ap.website === "string" ? ap.website : null,
      fullTimeEmployees:
        typeof ap.fullTimeEmployees === "number" ? ap.fullTimeEmployees : null,
      ceo: ceoName,
      ipoDate,
      longBusinessSummary:
        typeof ap.longBusinessSummary === "string" ? ap.longBusinessSummary : null,
      exchangeName: null, // exchange comes from the quote, not the profile
    },
    valuation: {
      peTrailing: num(sd.trailingPE),
      peForward: num(sd.forwardPE),
      pegRatio: num(ks.pegRatio),
      pbRatio: num(ks.priceToBook),
      psRatio: num(sd.priceToSalesTrailing12Months),
      evToEbitda: num(ks.enterpriseToEbitda),
      evToRevenue: num(ks.enterpriseToRevenue),
    },
    profitability: {
      grossMargin: num(fd.grossMargins),
      operatingMargin: num(fd.operatingMargins),
      netMargin: num(fd.profitMargins),
      returnOnEquity: num(fd.returnOnEquity),
      returnOnAssets: num(fd.returnOnAssets),
    },
    growth: {
      revenueGrowth: num(fd.revenueGrowth),
      earningsGrowth: num(fd.earningsGrowth),
    },
    balanceSheet: {
      debtToEquity: num(fd.debtToEquity),
      currentRatio: num(fd.currentRatio),
      quickRatio: num(fd.quickRatio),
      totalCash: num(fd.totalCash),
      totalDebt: num(fd.totalDebt),
    },
    dividend: {
      yield: num(sd.dividendYield),
      payoutRatio: num(sd.payoutRatio),
    },
    priceTargets: {
      mean: num(fd.targetMeanPrice),
      high: num(fd.targetHighPrice),
      low: num(fd.targetLowPrice),
      numberOfAnalystOpinions: num(fd.numberOfAnalystOpinions),
    },
    updatedAt: new Date().toISOString(),
  };
}

/* ---------------------------------------------------------------- financials */

function rawNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && "raw" in v) {
    const r = (v as { raw?: unknown }).raw;
    return typeof r === "number" && Number.isFinite(r) ? r : null;
  }
  return null;
}

function rowEndDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (v && typeof v === "object" && "fmt" in v) return String((v as { fmt?: string }).fmt ?? "");
  return "";
}

function rowPeriod(endDate: string, quarterly: boolean): string {
  if (!endDate) return "-";
  const d = new Date(endDate);
  if (Number.isNaN(d.getTime())) return endDate;
  if (!quarterly) return String(d.getUTCFullYear());
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `Q${q} FY${String(d.getUTCFullYear()).slice(-2)}`;
}

export async function getFinancials(symbol: string) {
  let summary;
  try {
    summary = await yf.quoteSummary(symbol, {
      modules: [
        "incomeStatementHistory",
        "incomeStatementHistoryQuarterly",
        "cashflowStatementHistory",
        "balanceSheetHistory",
      ],
    });
  } catch (err) {
    throw new ProviderError(PROVIDER, `financials failed: ${(err as Error).message}`);
  }

  if (!summary) throw new TickerNotFoundError(symbol);

  type IncomeBucket = { incomeStatementHistory?: Array<Record<string, unknown>> };
  const annualIncome = ((summary.incomeStatementHistory as IncomeBucket | undefined)
    ?.incomeStatementHistory ?? []) as Array<Record<string, unknown>>;
  const qIncome = ((summary.incomeStatementHistoryQuarterly as IncomeBucket | undefined)
    ?.incomeStatementHistory ?? []) as Array<Record<string, unknown>>;

  const mapIncome = (rows: Array<Record<string, unknown>>, quarterly: boolean) =>
    rows.map((r) => {
      const endDate = rowEndDate(r.endDate);
      return {
        period: rowPeriod(endDate, quarterly),
        endDate,
        revenue: rawNum(r.totalRevenue),
        grossProfit: rawNum(r.grossProfit),
        operatingIncome: rawNum(r.operatingIncome),
        netIncome: rawNum(r.netIncome),
        eps: null,
        ebitda: rawNum(r.ebitda),
      };
    });

  type CashBucket = { cashflowStatements?: Array<Record<string, unknown>> };
  const cf = ((summary.cashflowStatementHistory as CashBucket | undefined)?.cashflowStatements ?? []) as Array<
    Record<string, unknown>
  >;
  const cashRows = cf.map((r) => {
    const endDate = rowEndDate(r.endDate);
    const ocf = rawNum(r.totalCashFromOperatingActivities);
    const capex = rawNum(r.capitalExpenditures);
    return {
      period: rowPeriod(endDate, false),
      endDate,
      operatingCashFlow: ocf,
      capitalExpenditure: capex,
      freeCashFlow: ocf != null && capex != null ? ocf + capex : null,
    };
  });

  type BalanceBucket = { balanceSheetStatements?: Array<Record<string, unknown>> };
  const bs = ((summary.balanceSheetHistory as BalanceBucket | undefined)?.balanceSheetStatements ?? []) as Array<
    Record<string, unknown>
  >;
  const balanceRows = bs.map((r) => {
    const endDate = rowEndDate(r.endDate);
    return {
      period: rowPeriod(endDate, false),
      endDate,
      totalAssets: rawNum(r.totalAssets),
      totalLiabilities: rawNum(r.totalLiab),
      totalEquity: rawNum(r.totalStockholderEquity),
      cashAndEquivalents: rawNum(r.cash),
      totalDebt: rawNum(r.shortLongTermDebt),
    };
  });

  return {
    symbol,
    income: {
      annual: mapIncome(annualIncome, false),
      quarterly: mapIncome(qIncome, true),
    },
    cashflow: { annual: cashRows },
    balance: { annual: balanceRows },
    updatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ indices */

const INDEX_DEFS: ReadonlyArray<{ symbol: string; name: string; region: string }> = [
  { symbol: "^GSPC", name: "S&P 500", region: "US" },
  { symbol: "^IXIC", name: "NASDAQ", region: "US" },
  { symbol: "^DJI", name: "Dow Jones", region: "US" },
  { symbol: "^NSEI", name: "NIFTY 50", region: "IN" },
  { symbol: "^BSESN", name: "SENSEX", region: "IN" }, // BSE benchmark
  { symbol: "BTC-USD", name: "Bitcoin", region: "Crypto" },
];

/* ----------------------------------------------------------------- movers */

export interface MoverQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

interface YahooDailyMoversResponse {
  quotes?: Array<{
    symbol?: string;
    shortName?: string;
    longName?: string;
    regularMarketPrice?: number;
    regularMarketChange?: number;
    regularMarketChangePercent?: number;
    currency?: string;
  }>;
}

function mapMovers(response: YahooDailyMoversResponse, limit = 5): MoverQuote[] {
  const out: MoverQuote[] = [];
  for (const q of response.quotes ?? []) {
    if (!q.symbol || q.regularMarketPrice == null) continue;
    if (out.length >= limit) break;
    out.push({
      symbol: q.symbol,
      name: q.longName ?? q.shortName ?? q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      currency: q.currency ?? "USD",
    });
  }
  return out;
}

/* --------------------------------------------- screener (Yahoo screener) --- */

export type ScreenerId =
  | "day_gainers"
  | "day_losers"
  | "most_actives"
  | "aggressive_small_caps"
  | "growth_technology_stocks"
  | "undervalued_large_caps"
  | "top_mutual_funds";

interface YahooScreenerResponse {
  quotes?: Array<{
    symbol?: string;
    shortName?: string;
    longName?: string;
    regularMarketPrice?: number;
    regularMarketChange?: number;
    regularMarketChangePercent?: number;
    regularMarketVolume?: number;
    marketCap?: number;
    trailingPE?: number;
    fullExchangeName?: string;
    exchange?: string;
    currency?: string;
  }>;
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number | null;
  marketCap: number | null;
  peRatio: number | null;
  currency: string;
}

export async function runScreener(id: ScreenerId, count = 25): Promise<ScreenerResult[]> {
  let raw: YahooScreenerResponse;
  try {
    // Yahoo recently started returning a `newListingDate` field that's not in
    // yahoo-finance2 v3.14.1's strict schema, which causes a hard error on
    // every screener call. We disable result validation here - we already
    // defensively access fields below, so a malformed quote just gets skipped.
    raw = (await yf.screener(
      { scrIds: id, count },
      undefined,
      { validateResult: false },
    )) as YahooScreenerResponse;
  } catch (err) {
    throw new ProviderError(PROVIDER, `screener(${id}) failed: ${(err as Error).message}`);
  }
  const rows: ScreenerResult[] = [];
  for (const q of raw.quotes ?? []) {
    if (!q.symbol || q.regularMarketPrice == null) continue;
    if (rows.length >= count) break;
    rows.push({
      symbol: q.symbol,
      name: q.longName ?? q.shortName ?? q.symbol,
      exchange: q.fullExchangeName ?? q.exchange ?? "-",
      price: q.regularMarketPrice,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      volume: num(q.regularMarketVolume),
      marketCap: num(q.marketCap),
      peRatio: num(q.trailingPE),
      currency: q.currency ?? "USD",
    });
  }
  return rows;
}

/* --------------------------------------------------------- daily movers --- */

export async function getDailyGainers(): Promise<MoverQuote[]> {
  try {
    // `dailyGainers` is deprecated upstream; screener is the supported path.
    // `validateResult: false` ignores Yahoo's new `newListingDate` field
    // that v3.14.1's schema doesn't yet allow - see runScreener() above.
    const raw = (await yf.screener(
      { scrIds: "day_gainers", count: 10 },
      undefined,
      { validateResult: false },
    )) as YahooDailyMoversResponse;
    return mapMovers(raw, 5);
  } catch (err) {
    throw new ProviderError(PROVIDER, `gainers failed: ${(err as Error).message}`);
  }
}

export async function getDailyLosers(): Promise<MoverQuote[]> {
  try {
    const raw = (await yf.screener(
      { scrIds: "day_losers", count: 10 },
      undefined,
      { validateResult: false },
    )) as YahooDailyMoversResponse;
    return mapMovers(raw, 5);
  } catch (err) {
    throw new ProviderError(PROVIDER, `losers failed: ${(err as Error).message}`);
  }
}

/* ----------------------------------------------------------------- sectors */

const SECTOR_ETFS: ReadonlyArray<{ symbol: string; name: string }> = [
  { symbol: "XLK", name: "Technology" },
  { symbol: "XLV", name: "Health Care" },
  { symbol: "XLF", name: "Financials" },
  { symbol: "XLE", name: "Energy" },
  { symbol: "XLY", name: "Consumer Discretionary" },
  { symbol: "XLP", name: "Consumer Staples" },
  { symbol: "XLI", name: "Industrials" },
  { symbol: "XLB", name: "Materials" },
  { symbol: "XLU", name: "Utilities" },
  { symbol: "XLRE", name: "Real Estate" },
  { symbol: "XLC", name: "Communication" },
];

/**
 * Sector / category baskets per exchange. We don't have clean sector
 * indices for every market on Yahoo, so for non-US regions we route
 * through sector-representative large caps. The result is a heatmap
 * that gives the same intuition (what's hot today across the sleeve).
 */
const REGIONAL_SECTOR_BASKETS: Record<string, ReadonlyArray<{ symbol: string; name: string }>> = {
  IN_NSE: [
    { symbol: "TCS.NS", name: "IT" },
    { symbol: "HDFCBANK.NS", name: "Banking" },
    { symbol: "RELIANCE.NS", name: "Energy" },
    { symbol: "BHARTIARTL.NS", name: "Telecom" },
    { symbol: "SUNPHARMA.NS", name: "Pharma" },
    { symbol: "TATAMOTORS.NS", name: "Auto" },
    { symbol: "HINDUNILVR.NS", name: "FMCG" },
    { symbol: "TATASTEEL.NS", name: "Metals" },
    { symbol: "ULTRACEMCO.NS", name: "Cement" },
    { symbol: "ASIANPAINT.NS", name: "Consumer" },
  ],
  IN_BSE: [
    { symbol: "TCS.BO", name: "IT" },
    { symbol: "HDFCBANK.BO", name: "Banking" },
    { symbol: "RELIANCE.BO", name: "Energy" },
    { symbol: "BHARTIARTL.BO", name: "Telecom" },
    { symbol: "SUNPHARMA.BO", name: "Pharma" },
    { symbol: "TATAMOTORS.BO", name: "Auto" },
    { symbol: "HINDUNILVR.BO", name: "FMCG" },
    { symbol: "TATASTEEL.BO", name: "Metals" },
    { symbol: "ULTRACEMCO.BO", name: "Cement" },
    { symbol: "ASIANPAINT.BO", name: "Consumer" },
  ],
  LK_CSE: [
    { symbol: "JKH.N0000", name: "Diversified" },
    { symbol: "COMB.N0000", name: "Banking" },
    { symbol: "HNB.N0000", name: "Banking" },
    { symbol: "DIAL.N0000", name: "Telecom" },
    { symbol: "CTC.N0000", name: "Beverages" },
    { symbol: "SAMP.N0000", name: "Banking" },
    { symbol: "LOLC.N0000", name: "Finance" },
    { symbol: "BIL.N0000", name: "Beverages" },
  ],
  CRYPTO: [
    { symbol: "BTC-USD", name: "Bitcoin" },
    { symbol: "ETH-USD", name: "Ethereum" },
    { symbol: "SOL-USD", name: "Solana" },
    { symbol: "BNB-USD", name: "BNB" },
    { symbol: "XRP-USD", name: "XRP" },
    { symbol: "ADA-USD", name: "Cardano" },
    { symbol: "DOGE-USD", name: "Dogecoin" },
    { symbol: "AVAX-USD", name: "Avalanche" },
    { symbol: "DOT-USD", name: "Polkadot" },
    { symbol: "MATIC-USD", name: "Polygon" },
  ],
};

export interface SectorPerformance {
  symbol: string;
  name: string;
  changePercent: number;
  price: number;
}

export async function getSectorPerformance(): Promise<SectorPerformance[]> {
  const settled = await Promise.allSettled(
    SECTOR_ETFS.map(async (s) => {
      const q = await getQuote(s.symbol);
      return {
        symbol: s.symbol,
        name: s.name,
        changePercent: q.changePercent,
        price: q.price,
      } satisfies SectorPerformance;
    }),
  );
  return settled
    .filter((r): r is PromiseFulfilledResult<SectorPerformance> => r.status === "fulfilled")
    .map((r) => r.value);
}

/** Multi-exchange heatmap. For non-US regions we use sector-representative
 *  large caps because Yahoo doesn't expose clean sector indices outside the US. */
export async function getRegionalHeatmap(
  region: "US" | "IN_NSE" | "IN_BSE" | "LK_CSE" | "CRYPTO",
): Promise<SectorPerformance[]> {
  if (region === "US") return getSectorPerformance();
  const basket = REGIONAL_SECTOR_BASKETS[region] ?? [];
  const settled = await Promise.allSettled(
    basket.map(async (s) => {
      const q = await getQuote(s.symbol);
      return {
        symbol: s.symbol,
        name: s.name,
        changePercent: q.changePercent,
        price: q.price,
      } satisfies SectorPerformance;
    }),
  );
  return settled
    .filter((r): r is PromiseFulfilledResult<SectorPerformance> => r.status === "fulfilled")
    .map((r) => r.value);
}

/* ----------------------------------------------------------------- indices */

export async function getMarketIndices(): Promise<MarketIndex[]> {
  const settled = await Promise.allSettled(
    INDEX_DEFS.map(async (def) => {
      const q = await getQuote(def.symbol);
      return {
        symbol: def.symbol,
        name: def.name,
        value: q.price,
        change: q.change,
        changePercent: q.changePercent,
      } satisfies MarketIndex;
    }),
  );
  return settled
    .filter((r): r is PromiseFulfilledResult<MarketIndex> => r.status === "fulfilled")
    .map((r) => r.value);
}
