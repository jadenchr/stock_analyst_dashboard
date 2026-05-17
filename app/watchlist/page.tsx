import { WatchlistTable } from "@/components/watchlist/watchlist-table";

export const metadata = {
  title: "Watchlist",
};

export default function WatchlistPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pt-2">
      <header>
        <h1 className="font-display text-4xl tracking-tight text-foreground">Watchlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your saved tickers with live quotes. Drag to reorder, click to drill in.
        </p>
      </header>

      <WatchlistTable />
    </div>
  );
}
