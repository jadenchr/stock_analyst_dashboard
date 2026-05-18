"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GripVertical, Star, X } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useWatchlist } from "@/lib/store/watchlist";
import { useWatchlistSync } from "@/lib/store/watchlist-sync";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/utils/format";
import { apiGet } from "@/app/providers";
import type { Quote } from "@/lib/market-data/types";
import { qk } from "@/lib/api/client";

export function Watchlist() {
  const tickers = useWatchlist((s) => s.tickers);
  const reorder = useWatchlist((s) => s.reorder);
  const remove = useWatchlist((s) => s.remove);
  const [hydrated, setHydrated] = useState(false);

  // Mirrors the local watchlist to Supabase when the user is signed in.
  useWatchlistSync();

  useEffect(() => setHydrated(true), []);

  const queries = useQueries({
    queries: tickers.map((symbol) => ({
      queryKey: qk.quote(symbol),
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        apiGet<Quote>(`/api/stock/${symbol}/quote`, { signal }),
      enabled: hydrated,
      staleTime: 60_000,
      refetchInterval: 120_000,
    })),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tickers.indexOf(String(active.id));
    const newIndex = tickers.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    reorder(arrayMove(tickers, oldIndex, newIndex));
  }

  if (!hydrated) {
    return (
      <div className="flex-1 px-3" aria-hidden>
        <div className="space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 rounded-md bg-sidebar-accent/40" />
          ))}
        </div>
      </div>
    );
  }

  if (tickers.length === 0) {
    return (
      <div className="flex flex-1 items-start px-5">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Add stocks to your watchlist to track them here.
        </p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tickers} strategy={verticalListSortingStrategy}>
        <ul className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Watchlisted stocks">
          {tickers.map((symbol, i) => (
            <WatchlistRow
              key={symbol}
              symbol={symbol}
              quote={queries[i]?.data}
              onRemove={() => remove(symbol)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

interface RowProps {
  symbol: string;
  quote: Quote | undefined;
  onRemove: () => void;
}

function WatchlistRow({ symbol, quote, onRemove }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: symbol,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const tone = !quote
    ? "neutral"
    : quote.changePercent > 0
      ? "bull"
      : quote.changePercent < 0
        ? "bear"
        : "neutral";

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-1 rounded-md transition-colors hover:bg-sidebar-accent",
        isDragging && "z-10 bg-sidebar-accent shadow-elevated",
      )}
    >
      <button
        type="button"
        className="flex h-9 w-5 cursor-grab items-center justify-center text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing"
        aria-label={`Drag ${symbol}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" aria-hidden />
      </button>

      <Link
        href={`/stock/${symbol}`}
        className="flex flex-1 items-center justify-between gap-2 py-1.5 pr-1 text-sm"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Star className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden />
          <span className="font-mono text-xs font-semibold text-foreground">{symbol}</span>
        </div>
        <span
          className={cn(
            "font-mono text-[11px] tabular-nums",
            tone === "bull" && "text-bull",
            tone === "bear" && "text-bear",
            tone === "neutral" && "text-muted-foreground",
          )}
        >
          {quote ? formatPercent(quote.changePercent) : "—"}
        </span>
      </Link>

      <button
        type="button"
        onClick={onRemove}
        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground/0 transition-colors hover:bg-sidebar-accent hover:text-foreground group-hover:text-muted-foreground"
        aria-label={`Remove ${symbol} from watchlist`}
      >
        <X className="h-3 w-3" aria-hidden />
      </button>
    </li>
  );
}
