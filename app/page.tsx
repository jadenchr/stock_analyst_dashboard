import { HeroIntro } from "@/components/market/hero-intro";
import { IndicesGrid } from "@/components/market/indices-grid";
import { PopularTickers } from "@/components/market/popular-tickers";
import { TopMovers } from "@/components/market/top-movers";
import { SectorHeatmap } from "@/components/market/sector-heatmap";
import { RegionalSpotlight } from "@/components/market/regional-spotlight";

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 pt-2">
      <HeroIntro />
      <IndicesGrid />
      <SectorHeatmap />
      <TopMovers />
      <PopularTickers />
      <RegionalSpotlight />
    </div>
  );
}
