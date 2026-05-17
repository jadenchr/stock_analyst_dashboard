"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, ApiError } from "@/app/providers";
import type {
  Fundamentals,
  HistoricalPoint,
  HistoricalRange,
  InsiderTx,
  MarketIndex,
  NewsArticle,
  Quote,
  SearchResult,
  AnalystConsensus,
} from "@/lib/market-data/types";

/* ------------------------------------------------------------ keys */

export const qk = {
  search: (q: string) => ["search", q] as const,
  quote: (s: string) => ["quote", s] as const,
  fundamentals: (s: string) => ["fundamentals", s] as const,
  financials: (s: string) => ["financials", s] as const,
  historical: (s: string, r: HistoricalRange) => ["historical", s, r] as const,
  news: (s: string) => ["news", s] as const,
  insider: (s: string) => ["insider", s] as const,
  analysts: (s: string) => ["analysts", s] as const,
  marketOverview: () => ["market-overview"] as const,
  movers: () => ["movers"] as const,
  sectors: () => ["sectors"] as const,
};

export interface Mover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface Movers {
  gainers: Mover[];
  losers: Mover[];
}

export interface Sector {
  symbol: string;
  name: string;
  changePercent: number;
  price: number;
}

export function useMovers() {
  return useQuery({
    queryKey: qk.movers(),
    queryFn: ({ signal }) => apiGet<Movers>(`/api/market/movers`, { signal }),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export function useSectors() {
  return useQuery({
    queryKey: qk.sectors(),
    queryFn: ({ signal }) => apiGet<Sector[]>(`/api/market/sectors`, { signal }),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export interface RegionalSnapshot {
  india: Quote[];
  sriLanka: Quote[];
}

export function useRegional() {
  return useQuery({
    queryKey: ["regional"] as const,
    queryFn: ({ signal }) => apiGet<RegionalSnapshot>(`/api/market/regional`, { signal }),
    staleTime: 120_000,
    refetchInterval: 5 * 60_000,
  });
}

/* ---------------------------------------------------- AI Analyst Rating --- */

export type AIRating = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";

export interface AIAnalysis {
  rating: AIRating;
  confidence: number;
  priceTarget: number;
  targetHorizon: string;
  upside: number;
  summary: string;
  bullCase: string[];
  bearCase: string[];
  keyRisks: string[];
  catalysts: string[];
  valuation: string;
  technicals: string;
  sectorContext: string;
  lastUpdated?: string;
  // Metadata from route handler
  stubbed: boolean;
  model: string;
  cached: boolean;
  attempts?: number;
  reason?:
    | "cse-unsupported"
    | "not-configured"
    | "no-quote"
    | "insufficient-credits"
    | "model-error"
    | "validation-error";
}

export function useStockAnalysis(symbol: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: symbol ? (["analysis", symbol] as const) : (["analysis", "_disabled"] as const),
    queryFn: ({ signal }) =>
      apiGet<AIAnalysis>(`/api/analyze?ticker=${encodeURIComponent(symbol ?? "")}`, { signal }),
    enabled: Boolean(symbol) && (options?.enabled ?? true),
    // Server caches 15 min; keep client a hair under so refetches hit cache
    staleTime: 14 * 60_000,
    gcTime: 30 * 60_000,
    retry: (failureCount, err) => {
      // Don't hammer the rate limiter on 429s
      if (err instanceof ApiError && err.status === 429) return false;
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) return false;
      return failureCount < 1;
    },
    refetchOnWindowFocus: false,
  });
}

/* ------------------------------------------------------------ hooks */

export function useSearchQuery(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: qk.search(trimmed),
    queryFn: ({ signal }) =>
      apiGet<SearchResult[]>(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal }),
    enabled: trimmed.length >= 1,
    staleTime: 60_000,
  });
}

export function useQuote(symbol: string | null) {
  return useQuery({
    queryKey: symbol ? qk.quote(symbol) : ["quote", "_disabled"],
    queryFn: ({ signal }) => apiGet<Quote>(`/api/stock/${symbol}/quote`, { signal }),
    enabled: Boolean(symbol),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useFundamentals(symbol: string | null) {
  return useQuery({
    queryKey: symbol ? qk.fundamentals(symbol) : ["fundamentals", "_disabled"],
    queryFn: ({ signal }) =>
      apiGet<Fundamentals>(`/api/stock/${symbol}/fundamentals`, { signal }),
    enabled: Boolean(symbol),
    staleTime: 30 * 60_000,
  });
}

interface Financials {
  symbol: string;
  income: {
    annual: Array<{
      period: string;
      endDate: string;
      revenue: number | null;
      grossProfit: number | null;
      operatingIncome: number | null;
      netIncome: number | null;
      eps: number | null;
      ebitda: number | null;
    }>;
    quarterly: Array<{
      period: string;
      endDate: string;
      revenue: number | null;
      grossProfit: number | null;
      operatingIncome: number | null;
      netIncome: number | null;
      eps: number | null;
      ebitda: number | null;
    }>;
  };
  cashflow: {
    annual: Array<{
      period: string;
      endDate: string;
      operatingCashFlow: number | null;
      capitalExpenditure: number | null;
      freeCashFlow: number | null;
    }>;
  };
  balance: {
    annual: Array<{
      period: string;
      endDate: string;
      totalAssets: number | null;
      totalLiabilities: number | null;
      totalEquity: number | null;
      cashAndEquivalents: number | null;
      totalDebt: number | null;
    }>;
  };
  updatedAt: string;
}

export function useFinancials(symbol: string | null) {
  return useQuery({
    queryKey: symbol ? qk.financials(symbol) : ["financials", "_disabled"],
    queryFn: ({ signal }) =>
      apiGet<Financials>(`/api/stock/${symbol}/financials`, { signal }),
    enabled: Boolean(symbol),
    staleTime: 60 * 60_000,
  });
}

export type { Financials };

export function useHistorical(symbol: string | null, range: HistoricalRange) {
  return useQuery({
    queryKey: symbol ? qk.historical(symbol, range) : ["historical", "_disabled"],
    queryFn: ({ signal }) =>
      apiGet<HistoricalPoint[]>(`/api/stock/${symbol}/historical?range=${range}`, {
        signal,
      }),
    enabled: Boolean(symbol),
    staleTime: 5 * 60_000,
  });
}

export function useNews(symbol: string | null) {
  return useQuery({
    queryKey: symbol ? qk.news(symbol) : ["news", "_disabled"],
    queryFn: ({ signal }) => apiGet<NewsArticle[]>(`/api/stock/${symbol}/news`, { signal }),
    enabled: Boolean(symbol),
    staleTime: 5 * 60_000,
  });
}

export function useInsider(symbol: string | null) {
  return useQuery({
    queryKey: symbol ? qk.insider(symbol) : ["insider", "_disabled"],
    queryFn: ({ signal }) =>
      apiGet<InsiderTx[]>(`/api/stock/${symbol}/insider`, { signal }),
    enabled: Boolean(symbol),
    staleTime: 30 * 60_000,
  });
}

export function useAnalysts(symbol: string | null) {
  return useQuery({
    queryKey: symbol ? qk.analysts(symbol) : ["analysts", "_disabled"],
    queryFn: ({ signal }) =>
      apiGet<AnalystConsensus | null>(`/api/stock/${symbol}/analysts`, { signal }),
    enabled: Boolean(symbol),
    staleTime: 30 * 60_000,
  });
}

export interface MarketOverview {
  indices: MarketIndex[];
  popular: Quote[];
}

export function useMarketOverview() {
  return useQuery({
    queryKey: qk.marketOverview(),
    queryFn: ({ signal }) => apiGet<MarketOverview>(`/api/market/overview`, { signal }),
    staleTime: 30_000,
    refetchInterval: 90_000,
  });
}
