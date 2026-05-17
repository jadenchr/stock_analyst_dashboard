import "server-only";
import * as md from "@/lib/market-data";
import type { HistoricalPoint } from "@/lib/market-data/types";
import { sma, ema } from "@/lib/utils/indicators";
import type { StockDataForAnalysis } from "./prompts";

/**
 * Server-side assembler that builds the AI prompt input for a ticker.
 *
 * Fans out to every cached endpoint we already expose (quote, fundamentals,
 * financials, historical, analyst consensus) in parallel and computes the
 * derived technicals (50/200-MA distance, RSI, MACD signal) locally so we
 * don't burn Alpha Vantage's 5-req/min budget on every analysis.
 *
 * Returns `null` ONLY if the ticker doesn't even have a quote — every other
 * field is allowed to be missing (the prompt builder renders "N/A").
 */
export async function buildStockData(ticker: string): Promise<StockDataForAnalysis | null> {
  // Quote is the only hard requirement — it gives price + exchange + currency
  let quote;
  try {
    quote = await md.quote(ticker);
  } catch {
    return null;
  }

  // All other fetches are best-effort and parallelized
  const [fundamentalsRes, financialsRes, historicalRes, analystsRes] = await Promise.allSettled([
    md.fundamentals(ticker),
    md.financials(ticker),
    md.historical(ticker, "1Y"),
    md.analystConsensus(ticker),
  ]);

  const f = fundamentalsRes.status === "fulfilled" ? fundamentalsRes.value : null;
  const fin = financialsRes.status === "fulfilled" ? financialsRes.value : null;
  const hist = historicalRes.status === "fulfilled" ? historicalRes.value : [];
  const ac = analystsRes.status === "fulfilled" ? analystsRes.value : null;

  // Most-recent annual income row (Yahoo returns newest-first)
  const latestIncome = fin?.income.annual[0] ?? null;
  const latestCashflow = fin?.cashflow.annual[0] ?? null;

  // Technicals from historical close
  const tech = computeTechnicals(hist, quote.price);

  // Yahoo returns ratios as decimal fractions (0..1) — keep that scale but
  // multiply when we want percent for the prompt. Profitability is already in
  // 0..1, so multiply by 100 for the human-facing prompt.
  return {
    ticker: quote.symbol,
    companyName: quote.name,
    exchange: quote.exchange,
    sector: f?.profile?.sector ?? null,
    industry: f?.profile?.industry ?? null,
    currency: quote.currency,

    currentPrice: quote.price,
    week52Low: quote.yearLow,
    week52High: quote.yearHigh,
    marketCap: quote.marketCap,
    beta: f?.balanceSheet ? null : null, // beta isn't in our Fundamentals shape — leave for future

    peTrailing: f?.valuation.peTrailing ?? quote.peRatio,
    peForward: f?.valuation.peForward ?? quote.forwardPe,
    pbRatio: f?.valuation.pbRatio ?? null,
    psRatio: f?.valuation.psRatio ?? null,
    evToEbitda: f?.valuation.evToEbitda ?? null,
    pegRatio: f?.valuation.pegRatio ?? null,

    grossMargin: toPct(f?.profitability.grossMargin),
    operatingMargin: toPct(f?.profitability.operatingMargin),
    netMargin: toPct(f?.profitability.netMargin),
    returnOnEquity: toPct(f?.profitability.returnOnEquity),
    returnOnAssets: toPct(f?.profitability.returnOnAssets),

    revenueGrowth: toPct(f?.growth.revenueGrowth),
    earningsGrowth: toPct(f?.growth.earningsGrowth),

    revenue: latestIncome?.revenue ?? null,
    netIncome: latestIncome?.netIncome ?? null,
    eps: quote.eps,
    epsForward: null,

    totalCash: f?.balanceSheet.totalCash ?? null,
    totalDebt: f?.balanceSheet.totalDebt ?? null,
    // Yahoo's debt/equity arrives as percent (e.g. 121.4), not a decimal
    debtToEquity: f?.balanceSheet.debtToEquity ?? null,
    currentRatio: f?.balanceSheet.currentRatio ?? null,
    quickRatio: f?.balanceSheet.quickRatio ?? null,

    operatingCashFlow: latestCashflow?.operatingCashFlow ?? null,
    freeCashFlow: latestCashflow?.freeCashFlow ?? null,

    dividendYield: toPct(f?.dividend.yield),
    payoutRatio: toPct(f?.dividend.payoutRatio),

    priceVs50MA: tech.priceVs50MA,
    priceVs200MA: tech.priceVs200MA,
    rsi14: tech.rsi14,
    macdSignal: tech.macdSignal,

    analystStrongBuy: ac?.strongBuy ?? null,
    analystBuy: ac?.buy ?? null,
    analystHold: ac?.hold ?? null,
    analystSell: ac?.sell ?? null,
    analystStrongSell: ac?.strongSell ?? null,
    avgPriceTarget: f?.priceTargets?.mean ?? null,
    highPriceTarget: f?.priceTargets?.high ?? null,
    lowPriceTarget: f?.priceTargets?.low ?? null,
  };
}

function toPct(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return v * 100;
}

/* ----------------------------------------- technicals (computed locally) --- */

interface ComputedTechnicals {
  priceVs50MA: number | null;
  priceVs200MA: number | null;
  rsi14: number | null;
  macdSignal: "bullish" | "bearish" | "neutral" | null;
}

function computeTechnicals(hist: HistoricalPoint[], currentPrice: number): ComputedTechnicals {
  if (hist.length === 0) {
    return { priceVs50MA: null, priceVs200MA: null, rsi14: null, macdSignal: null };
  }
  const closes = hist.map((h) => h.close);

  // SMA distance from current price
  const sma50Series = sma(closes, 50);
  const sma200Series = sma(closes, 200);
  const lastSma50 = lastNonNull(sma50Series);
  const lastSma200 = lastNonNull(sma200Series);

  const priceVs50MA =
    lastSma50 != null ? ((currentPrice - lastSma50) / lastSma50) * 100 : null;
  const priceVs200MA =
    lastSma200 != null ? ((currentPrice - lastSma200) / lastSma200) * 100 : null;

  // RSI(14) — Wilder's smoothing
  const rsi14 = computeRSI(closes, 14);

  // MACD signal — sign of (EMA12 - EMA26) at the latest bar
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLast = pairLast(ema12, ema26);
  let macdSignal: ComputedTechnicals["macdSignal"] = null;
  if (macdLast) {
    const diff = macdLast.a - macdLast.b;
    if (diff > 0.001) macdSignal = "bullish";
    else if (diff < -0.001) macdSignal = "bearish";
    else macdSignal = "neutral";
  }

  return { priceVs50MA, priceVs200MA, rsi14, macdSignal };
}

function lastNonNull(arr: (number | null)[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] != null) return arr[i] as number;
  }
  return null;
}

function pairLast(a: (number | null)[], b: (number | null)[]): { a: number; b: number } | null {
  const len = Math.min(a.length, b.length);
  for (let i = len - 1; i >= 0; i--) {
    if (a[i] != null && b[i] != null) {
      return { a: a[i] as number, b: b[i] as number };
    }
  }
  return null;
}

function computeRSI(closes: readonly number[], period = 14): number | null {
  if (closes.length <= period) return null;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder's smoothing for the rest
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
