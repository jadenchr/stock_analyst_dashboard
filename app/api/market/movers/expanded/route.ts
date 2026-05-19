import { apiHandler } from "@/lib/api/handler";
import { cached, cacheKey, TTL } from "@/lib/cache";
import * as md from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Expanded movers feed used by the dedicated /movers page.
 * Pulls 25 of each (gainers, losers, most-active) via Yahoo's screener
 * module — the homepage only renders top 5 of each, so this isn't a
 * duplicate request, it's a deeper view. Cached for 60s.
 */
export const GET = apiHandler({ bucket: "movers-expanded", limit: 60 }, async () => {
  const [gainers, losers, mostActive] = await Promise.allSettled([
    cached(cacheKey("screener", "day_gainers", 25), TTL.marketOverview, () =>
      md.screener("day_gainers", 25),
    ),
    cached(cacheKey("screener", "day_losers", 25), TTL.marketOverview, () =>
      md.screener("day_losers", 25),
    ),
    cached(cacheKey("screener", "most_actives", 25), TTL.marketOverview, () =>
      md.screener("most_actives", 25),
    ),
  ]);

  return {
    gainers: gainers.status === "fulfilled" ? gainers.value : [],
    losers: losers.status === "fulfilled" ? losers.value : [],
    mostActive: mostActive.status === "fulfilled" ? mostActive.value : [],
  };
});
