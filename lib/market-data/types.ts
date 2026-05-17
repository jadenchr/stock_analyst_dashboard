import { z } from "zod";

/**
 * Canonical, provider-agnostic types. Every adapter MUST return these shapes
 * (or throw a typed error). Route handlers consume these types directly.
 */

export const QuoteSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  exchange: z.string(),
  currency: z.string(),
  price: z.number(),
  previousClose: z.number(),
  change: z.number(),
  changePercent: z.number(),
  dayHigh: z.number().nullable(),
  dayLow: z.number().nullable(),
  yearHigh: z.number().nullable(),
  yearLow: z.number().nullable(),
  volume: z.number().nullable(),
  avgVolume: z.number().nullable(),
  marketCap: z.number().nullable(),
  peRatio: z.number().nullable(),
  forwardPe: z.number().nullable(),
  eps: z.number().nullable(),
  dividendYield: z.number().nullable(),
  beta: z.number().nullable(),
  marketState: z.enum(["PRE", "REGULAR", "POST", "CLOSED"]),
  updatedAt: z.string(),
});

export type Quote = z.infer<typeof QuoteSchema>;

export const SearchResultSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  exchange: z.string(),
  type: z.string(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

export const HistoricalPointSchema = z.object({
  date: z.string(), // ISO date
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});

export type HistoricalPoint = z.infer<typeof HistoricalPointSchema>;

export const HISTORICAL_RANGES = ["1D", "5D", "1M", "3M", "6M", "1Y", "2Y", "5Y", "MAX"] as const;
export type HistoricalRange = (typeof HISTORICAL_RANGES)[number];

export const FundamentalsSchema = z.object({
  symbol: z.string(),
  valuation: z.object({
    peTrailing: z.number().nullable(),
    peForward: z.number().nullable(),
    pegRatio: z.number().nullable(),
    pbRatio: z.number().nullable(),
    psRatio: z.number().nullable(),
    evToEbitda: z.number().nullable(),
    evToRevenue: z.number().nullable(),
  }),
  profitability: z.object({
    grossMargin: z.number().nullable(),
    operatingMargin: z.number().nullable(),
    netMargin: z.number().nullable(),
    returnOnEquity: z.number().nullable(),
    returnOnAssets: z.number().nullable(),
  }),
  growth: z.object({
    revenueGrowth: z.number().nullable(),
    earningsGrowth: z.number().nullable(),
  }),
  balanceSheet: z.object({
    debtToEquity: z.number().nullable(),
    currentRatio: z.number().nullable(),
    quickRatio: z.number().nullable(),
    totalCash: z.number().nullable(),
    totalDebt: z.number().nullable(),
  }),
  dividend: z.object({
    yield: z.number().nullable(),
    payoutRatio: z.number().nullable(),
  }),
  updatedAt: z.string(),
});

export type Fundamentals = z.infer<typeof FundamentalsSchema>;

export const FinancialsRowSchema = z.object({
  period: z.string(), // e.g. "Q1 FY24" or "2023"
  endDate: z.string(),
  revenue: z.number().nullable(),
  grossProfit: z.number().nullable(),
  operatingIncome: z.number().nullable(),
  netIncome: z.number().nullable(),
  eps: z.number().nullable(),
  ebitda: z.number().nullable(),
});

export const FinancialsSchema = z.object({
  symbol: z.string(),
  income: z.object({
    annual: z.array(FinancialsRowSchema),
    quarterly: z.array(FinancialsRowSchema),
  }),
  cashflow: z.object({
    annual: z.array(
      z.object({
        period: z.string(),
        endDate: z.string(),
        operatingCashFlow: z.number().nullable(),
        capitalExpenditure: z.number().nullable(),
        freeCashFlow: z.number().nullable(),
      }),
    ),
  }),
  balance: z.object({
    annual: z.array(
      z.object({
        period: z.string(),
        endDate: z.string(),
        totalAssets: z.number().nullable(),
        totalLiabilities: z.number().nullable(),
        totalEquity: z.number().nullable(),
        cashAndEquivalents: z.number().nullable(),
        totalDebt: z.number().nullable(),
      }),
    ),
  }),
  updatedAt: z.string(),
});

export type Financials = z.infer<typeof FinancialsSchema>;

export const NewsArticleSchema = z.object({
  id: z.string(),
  headline: z.string(),
  summary: z.string().nullable(),
  url: z.string().url(),
  source: z.string(),
  imageUrl: z.string().url().nullable(),
  publishedAt: z.string(), // ISO
  sentiment: z.enum(["positive", "neutral", "negative"]).nullable(),
});

export type NewsArticle = z.infer<typeof NewsArticleSchema>;

export const InsiderTxSchema = z.object({
  name: z.string(),
  role: z.string().nullable(),
  transaction: z.enum(["buy", "sell", "other"]),
  shares: z.number().nullable(),
  price: z.number().nullable(),
  value: z.number().nullable(),
  date: z.string(),
});

export type InsiderTx = z.infer<typeof InsiderTxSchema>;

export const AnalystConsensusSchema = z.object({
  symbol: z.string(),
  asOf: z.string(),
  strongBuy: z.number(),
  buy: z.number(),
  hold: z.number(),
  sell: z.number(),
  strongSell: z.number(),
});

export type AnalystConsensus = z.infer<typeof AnalystConsensusSchema>;

export const MarketIndexSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  value: z.number(),
  change: z.number(),
  changePercent: z.number(),
});

export type MarketIndex = z.infer<typeof MarketIndexSchema>;
