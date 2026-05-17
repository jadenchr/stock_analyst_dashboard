import { z } from "zod";

/**
 * Ticker symbol regex — covers:
 *   • US tickers:       AAPL, MSFT, BRK.B (1–5 chars, optional .CLASS)
 *   • Indian tickers:   RELIANCE.BO, TCS.BO, INFY.NS (up to 8 base + .BO/.NS)
 *   • Sri Lankan CSE:   JKH.N0000, COMB.N0000, HAYL.N0000 (4 + .NXXXX)
 *   • Crypto pairs:     BTC-USD, ETH-USD
 *   • Indices:          ^GSPC, ^BSESN, ^NSEI, ^FTSE
 *
 * Max 12 chars covers every realistic case. The character class
 * intentionally excludes whitespace, control chars, and HTML metacharacters.
 */
export const TickerSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9.\-^]{1,12}$/, "Invalid ticker symbol");

export const SearchQuerySchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[\w .\-&^]+$/u, "Invalid characters in query");

export type Ticker = z.infer<typeof TickerSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export function safeTicker(input: string): string | null {
  const parsed = TickerSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

/* ----------------------------------------------- exchange classification --- */

export type ExchangeRegion = "US" | "IN_NSE" | "IN_BSE" | "LK_CSE" | "UK" | "OTHER";

/**
 * Classify a ticker into a region/exchange family by its suffix or prefix.
 * Used to route to the appropriate data adapter and label correctly in the UI.
 */
export function classifyTicker(symbol: string): ExchangeRegion {
  const s = symbol.toUpperCase();
  if (s.startsWith("^BSESN")) return "IN_BSE";
  if (s.endsWith(".BO") || s.endsWith(".BSE")) return "IN_BSE";
  if (s.endsWith(".NS")) return "IN_NSE";
  if (s.startsWith("^NSEI")) return "IN_NSE";
  // CSE Sri Lanka: ticker.NXXXX or ticker.XXXX0 — distinguishable from
  // US class-share dots by having 4–5 alphanumeric chars after the dot.
  if (/^[A-Z]{2,5}\.(N|X|P|R)\d{4}$/.test(s)) return "LK_CSE";
  if (s.endsWith(".L") || s.startsWith("^FTSE")) return "UK";
  return "US";
}

export function exchangeLabel(region: ExchangeRegion): string {
  switch (region) {
    case "IN_NSE":
      return "NSE";
    case "IN_BSE":
      return "BSE";
    case "LK_CSE":
      return "CSE";
    case "UK":
      return "LSE";
    case "US":
      return "US";
    default:
      return "—";
  }
}
