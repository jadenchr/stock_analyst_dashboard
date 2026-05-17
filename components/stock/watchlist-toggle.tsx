"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useWatchlist } from "@/lib/store/watchlist";
import { cn } from "@/lib/utils";

interface Props {
  symbol: string;
}

export function WatchlistToggle({ symbol }: Props) {
  const add = useWatchlist((s) => s.add);
  const remove = useWatchlist((s) => s.remove);
  const has = useWatchlist((s) => s.has(symbol));

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  if (!hydrated) {
    return <div className="h-8 w-32" aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={() => (has ? remove(symbol) : add(symbol))}
      className={cn(
        "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all duration-200 ease-out-expo",
        has
          ? "border-primary/40 bg-primary/10 text-primary hover:-translate-y-px hover:bg-primary/15"
          : "border-border/70 bg-card/60 text-muted-foreground hover:-translate-y-px hover:border-border hover:bg-card hover:text-foreground",
      )}
      aria-pressed={has}
    >
      <Star className={cn("h-3.5 w-3.5", has && "fill-current")} aria-hidden />
      {has ? "Watchlisted" : "Add to watchlist"}
    </button>
  );
}
