import { apiHandler } from "@/lib/api/handler";
import { cached, cacheKey, TTL } from "@/lib/cache";
import { getCurrentSession } from "@/lib/supabase/server";
import * as md from "@/lib/market-data";
import type { ScreenerId, ScreenerResult } from "@/lib/market-data";
import type { InvestmentStyle, RiskTolerance } from "@/lib/supabase/types";

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

export const GET = apiHandler({ bucket: "picks", limit: 30 }, async () => {
  const { user, profile } = await getCurrentSession();

  // Guests fall back to "Most Active" so the section still has value
  if (!user) {
    const rows = await cached(cacheKey("screener", "most_actives", 5), TTL.marketOverview, () =>
      md.screener("most_actives", 5),
    );
    const picks: Pick[] = rows.slice(0, 5).map((r) => ({
      ...r,
      rationale: buildRationale(r, "default"),
    }));
    return {
      picks,
      basis: { style: "default" as const, risk: "default" as const, screenerId: "most_actives" as const },
      isOnboarded: false,
    } satisfies PicksResponse;
  }

  const styles = (profile?.investment_styles ?? []) as InvestmentStyle[];
  const risk = (profile?.risk_tolerance ?? "moderate") as RiskTolerance;
  const { screenerId, primaryStyle } = mapProfileToScreener(styles, risk);

  const rows = await cached(
    cacheKey("picks", user.id, screenerId),
    TTL.marketOverview,
    async () => md.screener(screenerId, 10),
  );
  const picks: Pick[] = rows.slice(0, 5).map((r) => ({
    ...r,
    rationale: buildRationale(r, primaryStyle),
  }));

  return {
    picks,
    basis: {
      style: primaryStyle,
      risk,
      screenerId,
    },
    isOnboarded: Boolean(profile?.onboarded),
  } satisfies PicksResponse;
});
