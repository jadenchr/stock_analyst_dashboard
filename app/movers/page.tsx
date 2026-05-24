import type { Metadata } from "next";
import { MoversClient } from "@/components/movers/movers-client";

export const metadata: Metadata = {
  title: "Movers",
  description:
    "Today's biggest gainers, losers, and most active stocks - filter by sector and market cap, ranked by absolute % move.",
  openGraph: {
    title: "Today's Biggest Movers · StockVision",
    description:
      "Live gainers, losers, and most-active stocks with sector + market cap filters.",
  },
};

export default function MoversPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pt-2">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
          Today&rsquo;s biggest movers
        </h1>
        <p className="text-sm text-muted-foreground">
          The deepest view: 25 gainers, 25 losers, and the 25 most-active US stocks · filterable by
          market cap · refreshed every 90 seconds
        </p>
      </header>

      <MoversClient />
    </div>
  );
}
