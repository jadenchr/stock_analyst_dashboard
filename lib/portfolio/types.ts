/**
 * Public shapes for the portfolio API.
 * Mirror these in any client component that consumes /api/portfolio.
 */

export interface PortfolioHolding {
  id: string;
  symbol: string;
  shares: number;
  costBasis: number; // per share, in `currency`
  currency: string;
  purchaseDate: string; // YYYY-MM-DD
  notes: string | null;
  // Derived (filled at read-time using live quote)
  currentPrice: number | null;
  exchange: string | null;
  name: string | null;
  marketValue: number | null;
  totalCostBasis: number;
  unrealizedPL: number | null;
  unrealizedPLPct: number | null;
  // Day's change for this position
  dayChange: number | null;
  dayChangePct: number | null;
}

/**
 * Per-currency aggregate totals. We don't FX-convert across currencies in
 * v1 - if a user holds both USD and INR stocks, they see two totals.
 */
export interface PortfolioTotals {
  currency: string;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPct: number;
  dayChange: number;
  dayChangePct: number;
  holdingsCount: number;
}

export interface PortfolioResponse {
  holdings: PortfolioHolding[];
  /** One entry per currency present in the user's holdings. */
  totals: PortfolioTotals[];
  /** Stale-quote symbols (we couldn't fetch a current price). */
  stale: string[];
}

export interface PortfolioImportPreviewRow {
  rowIndex: number;
  raw: Record<string, string>;
  symbol: string | null;
  shares: number | null;
  costBasis: number | null;
  purchaseDate: string | null;
  notes: string | null;
  valid: boolean;
  errors: string[];
}

export interface PortfolioImportResult {
  inserted: number;
  skipped: number;
  errors: { rowIndex: number; reason: string }[];
}
