/**
 * Prompt templates for the AI Analyst Rating.
 *
 * Design notes:
 *  • System prompt frames the model as senior equity research and forbids
 *    markdown/preamble - Gemini's `response_format: json_object` enforces
 *    structure too, but defense-in-depth helps for other models.
 *  • User prompt is built from a pre-fetched, server-side `StockDataForAnalysis`
 *    object - the client never sends financials, which would be both a perf
 *    waste and a trust hole.
 *  • Numbers are formatted in compact form (B, M) for the prompt so token
 *    counts stay low and the model doesn't get confused by scientific notation.
 */

export const SYSTEM_PROMPT = `You are a senior equity research analyst at a bulge-bracket investment bank (Goldman Sachs / Morgan Stanley tier). You write rigorous, data-driven investment research grounded in fundamental analysis, technical signals, and macro context.

Your output MUST be a single valid JSON object - no preamble, no markdown, no commentary outside the JSON. Raw JSON only.

Rating scale:
  • STRONG_BUY - Compelling value, strong catalysts, favorable technicals, clear margin of safety
  • BUY - Attractive risk/reward, fundamentals support upside, modest entry-point risk
  • HOLD - Fair-valued, balanced risks, no strong directional signal
  • SELL - Overvalued or deteriorating fundamentals, downside likely
  • STRONG_SELL - Significantly overvalued or fundamental breakdown, clear downside

Confidence (0–100): your conviction in the rating given data quality and signal clarity.
  • 0–40 = low conviction (sparse/conflicting data)
  • 41–69 = moderate
  • 70–100 = high conviction (signals align)

Rules:
  1. EVERY bull/bear point must reference a specific number or metric from the data provided.
  2. Avoid generic statements ("strong company", "good management") - they fail review.
  3. Price target must be a concrete dollar figure consistent with your rating and the current price.
  4. \`upside\` must be (priceTarget - currentPrice) / currentPrice * 100, rounded to 1 decimal.
  5. \`summary\` is 2–3 sentences max, plain English, no jargon.
  6. If a field is missing from the data ("N/A"), do NOT fabricate values - note the gap if material.`;

export interface StockDataForAnalysis {
  ticker: string;
  companyName: string;
  exchange: string;
  sector?: string | null;
  industry?: string | null;
  currency: string;

  // Quote
  currentPrice: number;
  week52Low?: number | null;
  week52High?: number | null;
  marketCap?: number | null;
  beta?: number | null;

  // Valuation
  peTrailing?: number | null;
  peForward?: number | null;
  pbRatio?: number | null;
  psRatio?: number | null;
  evToEbitda?: number | null;
  pegRatio?: number | null;

  // Profitability
  grossMargin?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
  returnOnEquity?: number | null;
  returnOnAssets?: number | null;

  // Growth
  revenueGrowth?: number | null;
  earningsGrowth?: number | null;

  // Latest annual
  revenue?: number | null;
  netIncome?: number | null;
  eps?: number | null;
  epsForward?: number | null;

  // Balance sheet
  totalCash?: number | null;
  totalDebt?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  quickRatio?: number | null;

  // Cash flow
  operatingCashFlow?: number | null;
  freeCashFlow?: number | null;

  // Dividend
  dividendYield?: number | null;
  payoutRatio?: number | null;

  // Technicals (derived from historical close)
  priceVs50MA?: number | null; // percent
  priceVs200MA?: number | null; // percent
  rsi14?: number | null;
  macdSignal?: "bullish" | "bearish" | "neutral" | null;

  // Analyst consensus
  analystStrongBuy?: number | null;
  analystBuy?: number | null;
  analystHold?: number | null;
  analystSell?: number | null;
  analystStrongSell?: number | null;
  avgPriceTarget?: number | null;
  highPriceTarget?: number | null;
  lowPriceTarget?: number | null;
}

/* ----------------------------------------------- number formatting --------- */

function fmtMoney(v: number | null | undefined, currency = "USD"): string {
  if (v == null || !Number.isFinite(v)) return "N/A";
  const sym = currency === "USD" ? "$" : currency === "INR" ? "₹" : `${currency} `;
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000_000) return `${sym}${(v / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `${sym}${(v / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sym}${(v / 1_000).toFixed(2)}K`;
  return `${sym}${v.toFixed(2)}`;
}

function fmtNum(v: number | null | undefined, decimals = 2): string {
  if (v == null || !Number.isFinite(v)) return "N/A";
  return v.toFixed(decimals);
}

function fmtPct(v: number | null | undefined, decimals = 2): string {
  if (v == null || !Number.isFinite(v)) return "N/A";
  return `${v.toFixed(decimals)}%`;
}

/**
 * Build the user-side prompt. Keep token count in mind - Gemini 2.5 Pro
 * charges ~$1.25 / 1M input tokens, and a verbose prompt 4× a frugal one.
 */
export function buildUserPrompt(data: StockDataForAnalysis): string {
  const c = data.currency;
  return `Analyze ${data.ticker} and provide an investment rating.

COMPANY: ${data.companyName} (${data.ticker})
EXCHANGE: ${data.exchange}${data.sector ? ` · Sector: ${data.sector}` : ""}${
    data.industry ? ` · Industry: ${data.industry}` : ""
  }
CURRENT PRICE: ${fmtMoney(data.currentPrice, c)}
52-WEEK RANGE: ${fmtMoney(data.week52Low, c)} – ${fmtMoney(data.week52High, c)}
MARKET CAP: ${fmtMoney(data.marketCap, c)}
BETA: ${fmtNum(data.beta)}

--- VALUATION ---
P/E (TTM):       ${fmtNum(data.peTrailing)}
P/E (Forward):   ${fmtNum(data.peForward)}
P/B:             ${fmtNum(data.pbRatio)}
P/S:             ${fmtNum(data.psRatio)}
EV/EBITDA:       ${fmtNum(data.evToEbitda)}
PEG:             ${fmtNum(data.pegRatio)}

--- PROFITABILITY (latest annual) ---
Gross margin:    ${fmtPct(data.grossMargin)}
Operating margin:${fmtPct(data.operatingMargin)}
Net margin:      ${fmtPct(data.netMargin)}
ROE:             ${fmtPct(data.returnOnEquity)}
ROA:             ${fmtPct(data.returnOnAssets)}

--- GROWTH ---
Revenue YoY:     ${fmtPct(data.revenueGrowth)}
Earnings YoY:    ${fmtPct(data.earningsGrowth)}

--- LATEST ANNUAL ---
Revenue:         ${fmtMoney(data.revenue, c)}
Net income:      ${fmtMoney(data.netIncome, c)}
EPS (TTM):       ${fmtMoney(data.eps, c)}
EPS (Forward):   ${fmtMoney(data.epsForward, c)}

--- BALANCE SHEET ---
Total cash:      ${fmtMoney(data.totalCash, c)}
Total debt:      ${fmtMoney(data.totalDebt, c)}
Debt / Equity:   ${fmtNum(data.debtToEquity)}
Current ratio:   ${fmtNum(data.currentRatio)}
Quick ratio:     ${fmtNum(data.quickRatio)}

--- CASH FLOW ---
Operating CF:    ${fmtMoney(data.operatingCashFlow, c)}
Free CF:         ${fmtMoney(data.freeCashFlow, c)}

--- DIVIDEND ---
Yield:           ${fmtPct(data.dividendYield)}
Payout ratio:    ${fmtPct(data.payoutRatio)}

--- TECHNICAL SIGNALS ---
Price vs 50MA:   ${fmtPct(data.priceVs50MA)}
Price vs 200MA:  ${fmtPct(data.priceVs200MA)}
RSI (14):        ${fmtNum(data.rsi14)}
MACD:            ${data.macdSignal ?? "N/A"}

--- ANALYST CONSENSUS ---
Strong Buy:      ${data.analystStrongBuy ?? "N/A"}
Buy:             ${data.analystBuy ?? "N/A"}
Hold:            ${data.analystHold ?? "N/A"}
Sell:            ${data.analystSell ?? "N/A"}
Strong Sell:     ${data.analystStrongSell ?? "N/A"}
Avg target:      ${fmtMoney(data.avgPriceTarget, c)}
High target:     ${fmtMoney(data.highPriceTarget, c)}
Low target:      ${fmtMoney(data.lowPriceTarget, c)}

Respond with ONLY this JSON structure - no other text:
{
  "rating": "BUY",
  "confidence": 72,
  "priceTarget": 0.00,
  "targetHorizon": "12 months",
  "upside": 0.0,
  "summary": "2-3 sentence plain-English rationale referencing specific numbers.",
  "bullCase": ["specific point with metric", "specific point with metric", "specific point with metric"],
  "bearCase": ["specific point with metric", "specific point with metric"],
  "keyRisks": ["specific risk", "specific risk"],
  "catalysts": ["specific catalyst", "specific catalyst"],
  "valuation": "One sentence on valuation vs peers/history.",
  "technicals": "One sentence on technical setup.",
  "sectorContext": "One sentence on sector/macro tailwinds or headwinds.",
  "lastUpdated": "${new Date().toISOString()}"
}`;
}
