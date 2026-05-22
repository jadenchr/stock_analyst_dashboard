import { HeroIntro } from "@/components/market/hero-intro";
import { IndicesGrid } from "@/components/market/indices-grid";
import { PopularTickers } from "@/components/market/popular-tickers";
import { TopMovers } from "@/components/market/top-movers";
import { SectorHeatmap } from "@/components/market/sector-heatmap";
import { RegionalSpotlight } from "@/components/market/regional-spotlight";
import { ExchangeFilterBar } from "@/components/market/exchange-filter-bar";
import { ForYou } from "@/components/market/for-you";

/**
 * Signed-in dashboard home — the "Markets" workspace. Server-renders the
 * client widgets which fetch live data via TanStack Query.
 */
export function DashboardHome() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 pt-2">
      <HeroIntro />
      <ExchangeFilterBar />
      <ForYou />
      <IndicesGrid />
      <SectorHeatmap />
      <TopMovers />
      <PopularTickers />
      <RegionalSpotlight />
    </div>
  );
}
