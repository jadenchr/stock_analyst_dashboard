"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, GripVertical, Star, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { formatCompactMoney, formatCurrency, formatPercent } from "@/lib/utils/format";
import { apiGet } from "@/app/providers";
import { qk } from "@/lib/api/client";
import type { Quote } from "@/lib/market-data/types";
import { SkeletonBlock } from "@/components/ui/skeleton-block";

export function WatchlistTable() {
  const tickers = useWatchlist((s) => s.tickers);
  const reorder = useWatchlist((s) => s.reorder);
  const remove = useWatchlist((s) => s.remove);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  const queries = useQueries({
    queries: tickers.map((symbol) => ({
      queryKey: qk.quote(symbol),
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        apiGet<Quote>(`/api/stock/${symbol}/quote`, { signal }),
      enabled: hydrated,
      staleTime: 60_000,
      refetchInterval: 90_000,
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
      <div className="glass flex flex-col gap-2 rounded-2xl p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-12" />
        ))}
      </div>
    );
  }

  if (tickers.length === 0) {
    return (
      <div className="glass flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center">
        <Star className="h-6 w-6 text-muted-foreground" aria-hidden />
        <h2 className="font-display text-xl tracking-tight text-foreground">
          Your watchlist is empty
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Use{" "}
          <kbd className="rounded border border-border/70 bg-card/60 px-1.5 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>{" "}
          to search any stock, then tap{" "}
          <span className="font-medium text-foreground">Add to watchlist</span> on its detail page.
        </p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tickers} strategy={verticalListSortingStrategy}>
        <div className="glass overflow-hidden rounded-2xl">
          {/* Header row */}
          <div className="grid grid-cols-[1.5rem_minmax(120px,1fr)_minmax(0,1.4fr)_120px_120px_120px_2rem] items-center gap-3 border-b border-border/60 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:gap-4">
            <span />
            <span>Symbol</span>
            <span className="hidden sm:block">Name</span>
            <span className="text-right">Price</span>
            <span className="text-right">Change</span>
            <span className="text-right">Market Cap</span>
            <span />
          </div>
          <ul role="list">
            {tickers.map((symbol, i) => (
              <WatchlistRow
                key={symbol}
                symbol={symbol}
                quote={queries[i]?.data}
                isLoading={queries[i]?.isLoading ?? false}
                onRemove={() => remove(symbol)}
              />
            ))}
          </ul>
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface RowProps {
  symbol: string;
  quote: Quote | undefined;
  isLoading: boolean;
  onRemove: () => void;
}

function WatchlistRow({ symbol, quote, isLoading, onRemove }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: symbol,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const positive = quote != null && quote.changePercent >= 0;
  const Arrow = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group grid grid-cols-[1.5rem_minmax(120px,1fr)_minmax(0,1.4fr)_120px_120px_120px_2rem] items-center gap-3 border-b border-border/30 px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-muted/30 sm:gap-4",
        isDragging && "z-10 bg-muted/40",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-6 w-6 cursor-grab items-center justify-center text-muted-foreground/50 transition-colors hover:text-foreground active:cursor-grabbing"
        aria-label={`Drag ${symbol}`}
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden />
      </button>
      <Link
        href={`/stock/${symbol}`}
        className="flex items-center gap-2 transition-colors hover:text-primary"
      >
        <span className="font-mono text-sm font-semibold text-foreground">{symbol}</span>
        {quote && <span className="badge-ticker">{quote.exchange.slice(0, 8)}</span>}
      </Link>
      <span className="hidden truncate text-muted-foreground sm:block">
        {isLoading ? <SkeletonBlock className="h-3 w-32" /> : (quote?.name ?? "—")}
      </span>
      <span className="text-right font-mono tabular-nums text-foreground">
        {isLoading ? (
          <SkeletonBlock className="ml-auto h-4 w-16" />
        ) : quote ? (
          formatCurrency(quote.price, quote.currency)
        ) : (
          "—"
        )}
      </span>
      <span
        className={cn(
          "inline-flex items-center justify-end gap-1 text-right font-mono tabular-nums",
          quote == null ? "text-muted-foreground" : positive ? "text-bull" : "text-bear",
        )}
      >
        {quote && <Arrow className="h-3 w-3" aria-hidden />}
        {isLoading ? (
          <SkeletonBlock className="h-4 w-14" />
        ) : quote ? (
          formatPercent(quote.changePercent)
        ) : (
          "—"
        )}
      </span>
      <span className="text-right font-mono tabular-nums text-muted-foreground">
        {isLoading ? (
          <SkeletonBlock className="ml-auto h-4 w-14" />
        ) : quote?.marketCap != null ? (
          formatCompactMoney(quote.marketCap, quote.currency)
        ) : (
          "—"
        )}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Remove ${symbol}`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
    </li>
  );
}
