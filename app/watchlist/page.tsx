import type { Metadata } from "next";
import { WatchlistGate } from "@/components/watchlist/watchlist-gate";

export const metadata: Metadata = {
  title: "Watchlist",
  description:
    "Your live, drag-to-reorder watchlist of stocks across US, India, Sri Lanka, UK, and crypto. Synced across devices when signed in.",
  openGraph: {
    title: "Your watchlist · StockVision",
    description:
      "Drag-to-reorder watchlist with live quotes and AI rating updates.",
  },
};

export default function WatchlistPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pt-2">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
          Watchlist
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live quotes, drag-to-reorder, cross-device sync. Click any row to drill in.
        </p>
      </header>

      <WatchlistGate />
    </div>
  );
}
