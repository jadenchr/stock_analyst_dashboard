import { apiHandler } from "@/lib/api/handler";
import { cached, cacheKey, TTL } from "@/lib/cache";
import { getCurrentSession } from "@/lib/supabase/server";
import * as md from "@/lib/market-data";
import type { ScreenerId, ScreenerResult } from "@/lib/market-data";
import type { ExchangeKey, InvestmentStyle, RiskTolerance } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* Curated regional baskets — used when the user filters by exchange. */
/* Yahoo screeners are US-centric, so for non-US exchanges we hand-   */
/* picked the most-watched names per market and synthesize "picks"    */
/* from live quotes ranked by intraday % change.                       */
/* ------------------------------------------------------------------ */

const REGIONAL_BASKETS: Partial<Record<ExchangeKey, string[]>> = {
  IN_NSE: [
    "RELIANCE.NS",
    "TCS.NS",
    "HDFCBANK.NS",
    "INFY.NS",
    "ICICIBANK.NS",
    "HINDUNILVR.NS",
    "BHARTIARTL.NS",
    "ITC.NS",
    "SBIN.NS",
    "BAJFINANCE.NS",
  ],
  IN_BSE: [
    "RELIANCE.BO",
    "TCS.BO",
    "HDFCBANK.BO",
    "INFY.BO",
    "ICICIBANK.BO",
    "HINDUNILVR.BO",
    "BHARTIARTL.BO",
    "ITC.BO",
    "SBIN.BO",
    "BAJFINANCE.BO",
  ],
  LK_CSE: [
    "JKH.N0000",
    "COMB.N0000",
    "HNB.N0000",
    "SAMP.N0000",
    "DIAL.N0000",
    "LOLC.N0000",
    "CTC.N0000",
    "BIL.N0000",
  ],
  CRYPTO: [
    "BTC-USD",
    "ETH-USD",
    "SOL-USD",
    "BNB-USD",
    "XRP-USD",
    "ADA-USD",
    "DOGE-USD",
    "AVAX-USD",
  ],
};

const REGIONAL_LABELS: Partial<Record<ExchangeKey, string>> = {
  IN_NSE: "India NSE",
  IN_BSE: "India BSE",
  LK_CSE: "Sri Lanka CSE",
  CRYPTO: "Crypto",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Personalized "For You" picks.
 *
 * Strategy (no extra AI cost):
 *   1. Read the signed-in user's profile (style, risk, preferred exchanges).
 *   2. Map (style, risk) to the closest matching Yahoo screener preset:
 *
 *        growth + aggressive → growth_technology_stocks
 *        growth + moderate   → growth_technology_stocks
 *        growth + conservative → most_actives
 *        value  + any        → undervalued_large_caps  (Pro screen)
 *        income + any        → most_actives  (until we add a dividend screen)
 *        speculation + any   → aggressive_small_caps
 *
 *   3. Pull the top 5 results from that screener, attach a per-pick
 *      rationale string we render in the UI.
 *
 * Guest / not-onboarded users get a sensible default ("most_actives").
 *
 * Phase 8 upgrade path: pass top-20 candidates + profile to Gemini for
 * actual model-generated picks. The contract stays the same — UI just
 * renders whatever `rationale` we put on each pick.
 */

interface Pick extends ScreenerResult {
  rationale: string;
}

interface PicksResponse {
  picks: Pick[];
  basis: {
    style: InvestmentStyle | "default";
    risk: RiskTolerance | "default";
    screenerId: ScreenerId;
  };
  isOnboarded: boolean;
}

function mapProfileToScreener(
  styles: InvestmentStyle[],
  risk: RiskTolerance,
): { screenerId: ScreenerId; primaryStyle: InvestmentStyle | "default" } {
  // Pick a representative style — the first the user selected wins.
  const style: InvestmentStyle | undefined = styles[0];

  if (style === "value") {
    return { screenerId: "undervalued_large_caps", primaryStyle: "value" };
  }
  if (style === "speculation") {
    return { screenerId: "aggressive_small_caps", primaryStyle: "speculation" };
  }
  if (style === "growth") {
    if (risk === "conservative") {
      // Conservative growth — most-active large names trump small-cap rockets
      return { screenerId: "most_actives", primaryStyle: "growth" };
    }
    return { screenerId: "growth_technology_stocks", primaryStyle: "growth" };
  }
  if (style === "income") {
    return { screenerId: "most_actives", primaryStyle: "income" };
  }
  return { screenerId: "most_actives", primaryStyle: "default" };
}

function buildRationale(
  pick: ScreenerResult,
  style: InvestmentStyle | "default",
): string {
  const moveDir = pick.changePercent >= 0 ? "up" : "down";
  const pct = Math.abs(pick.changePercent).toFixed(1);
  const peStr = pick.peRatio != null ? `P/E ${pick.peRatio.toFixed(1)}` : "P/E n/a";

  switch (style) {
    case "growth":
      return `Aligned with growth — currently ${moveDir} ${pct}% today, ${peStr}.`;
    case "value":
      return `Value candidate — ${peStr}, currently trading ${moveDir} ${pct}% intraday.`;
    case "speculation":
      return `High-beta name — ${moveDir} ${pct}% today, fits aggressive risk.`;
    case "income":
      return `High-volume blue chip — ${peStr}, ${moveDir} ${pct}% intraday.`;
    default:
      return `Top-of-volume today — ${moveDir} ${pct}%.`;
  }
}

/** Convert curated-basket quotes into screener-shaped Picks. */
async function regionalPicks(
  exchange: ExchangeKey,
  primaryStyle: InvestmentStyle | "default",
): Promise<Pick[]> {
  const basket = REGIONAL_BASKETS[exchange] ?? [];
  if (basket.length === 0) return [];
  const quotes = await cached(
    cacheKey("regional-picks", exchange),
    TTL.marketOverview,
    async () => md.quotes(basket),
  );
  // Rank by |intraday %| descending so the most-active names surface first.
  const ranked = [...quotes].sort(
    (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent),
  );
  return ranked.slice(0, 5).map((q) => {
    const row: ScreenerResult = {
      symbol: q.symbol,
      name: q.name,
      exchange: q.exchange,
      price: q.price,
      change: q.change,
      changePercent: q.changePercent,
      volume: q.volume,
      marketCap: q.marketCap ?? null,
      peRatio: null,
      currency: q.currency,
    };
    return { ...row, rationale: buildRationale(row, primaryStyle) };
  });
}

function parseExchange(raw: string | null): ExchangeKey | "all" | "US" {
  if (!raw) return "all";
  if (raw === "all") return "all";
  if (raw === "US") return "US";
  if (raw === "IN_NSE" || raw === "IN_BSE" || raw === "LK_CSE" || raw === "CRYPTO") {
    return raw;
  }
  // Unknown / legacy (e.g. "UK") — treat as "all".
  return "all";
}

export const GET = apiHandler({ bucket: "picks", limit: 30 }, async ({ url }) => {
  const exchange = parseExchange(url.searchParams.get("exchange"));
  const { user, profile } = await getCurrentSession();

  const styles = (profile?.investment_styles ?? []) as InvestmentStyle[];
  const risk = (profile?.risk_tolerance ?? "moderate") as RiskTolerance;
  const { screenerId, primaryStyle } = user
    ? mapProfileToScreener(styles, risk)
    : { screenerId: "most_actives" as ScreenerId, primaryStyle: "default" as const };
  const basisStyle: InvestmentStyle | "default" = user ? primaryStyle : "default";
  const basisRisk: RiskTolerance | "default" = user ? risk : "default";

  // Non-US exchange → use the curated regional basket. Yahoo screeners
  // don't expose Indian / Sri Lankan / Crypto datasets, so we hand-rolled
  // the lists above.
  if (exchange !== "all" && exchange !== "US") {
    const picks = await regionalPicks(exchange, basisStyle);
    return {
      picks,
      basis: { style: basisStyle, risk: basisRisk, screenerId: `regional:${exchange}` as ScreenerId },
      isOnboarded: Boolean(profile?.onboarded),
      region: REGIONAL_LABELS[exchange] ?? exchange,
    } satisfies PicksResponse & { region?: string };
  }

  // US / "all" — use the Yahoo screener path.
  const rows = await cached(
    cacheKey("picks", user?.id ?? "guest", screenerId),
    TTL.marketOverview,
    async () => md.screener(screenerId, 10),
  );
  const picks: Pick[] = rows.slice(0, 5).map((r) => ({
    ...r,
    rationale: buildRationale(r, basisStyle),
  }));

  return {
    picks,
    basis: { style: basisStyle, risk: basisRisk, screenerId },
    isOnboarded: Boolean(profile?.onboarded),
  } satisfies PicksResponse;
});
