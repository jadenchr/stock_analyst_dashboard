"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Bell, Eye, LogIn, Sparkles, Star } from "lucide-react";
import { apiGet } from "@/app/providers";
import { qk } from "@/lib/api/client";
import type { Quote } from "@/lib/market-data/types";
import { cn } from "@/lib/utils";
import { formatCompactMoney, formatCurrency, formatPercent } from "@/lib/utils/format";
import { SkeletonBlock } from "@/components/ui/skeleton-block";

const DEMO_TICKERS = ["AAPL", "NVDA", "MSFT", "TSLA", "GOOGL"] as const;

/**
 * Signed-out demo: shows the watchlist UI using real live quotes for a
 * handful of blue chips, with a sign-in overlay invitation. Converts
 * meaningfully better than the previous "empty state with one sentence."
 */
export function WatchlistDemo() {
  const queries = useQueries({
    queries: DEMO_TICKERS.map((symbol) => ({
      queryKey: qk.quote(symbol),
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        apiGet<Quote>(`/api/stock/${symbol}/quote`, { signal }),
      staleTime: 60_000,
      refetchInterval: 120_000,
    })),
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Persuasion strip */}
      <section className="glass relative overflow-hidden rounded-2xl">
        <div className="bg-aurora pointer-events-none absolute inset-0" aria-hidden />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />

        <div className="relative grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                <Star className="h-4 w-4 text-primary" aria-hidden />
              </span>
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Your stocks, your way
              </h2>
            </div>
            <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
              Build a live watchlist of any of 30,000+ tickers. We&rsquo;ll keep it synced across
              your devices, push price alerts when you&rsquo;re away, and surface AI ratings the
              moment they update.
            </p>
            <ul className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <Eye className="h-3 w-3 text-primary" aria-hidden />
                Live quotes & sync across devices
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Bell className="h-3 w-3 text-primary" aria-hidden />
                Price alerts (Pro)
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" aria-hidden />
                AI rating updates
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <Link
              href="/auth/signin?next=/watchlist"
              className="group inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Sign in with Google
            </Link>
            <span className="text-[10px] text-muted-foreground">
              Free · 5 seconds · no credit card
            </span>
          </div>
        </div>
      </section>

      {/* Live preview rows */}
      <section aria-label="Watchlist preview" className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
              See what a watchlist looks like
            </h3>
            <p className="text-xs text-muted-foreground">
              Live data — the prices below are real, but the watchlist is sample-only until you
              sign in.
            </p>
          </div>
          <span className="hint-chip">
            <Sparkles className="h-3 w-3 text-primary" aria-hidden />
            Preview
          </span>
        </div>

        <div className="glass relative overflow-hidden rounded-2xl">
          {/* Header row mirrors the real /watchlist table */}
          <div className="grid grid-cols-[minmax(120px,1fr)_minmax(0,1.4fr)_120px_120px_120px] items-center gap-3 border-b border-border/60 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:gap-4">
            <span>Symbol</span>
            <span className="hidden sm:block">Name</span>
            <span className="text-right">Price</span>
            <span className="text-right">Change</span>
            <span className="text-right">Market Cap</span>
          </div>
          <ul role="list">
            {DEMO_TICKERS.map((symbol, i) => {
              const quote = queries[i]?.data;
              const loading = queries[i]?.isLoading;
              const positive = quote != null && quote.changePercent >= 0;
              const Arrow = positive ? ArrowUpRight : ArrowDownRight;

              return (
                <motion.li
                  key={symbol}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    "group grid grid-cols-[minmax(120px,1fr)_minmax(0,1.4fr)_120px_120px_120px] items-center gap-3 border-b border-border/30 px-4 py-3 text-sm transition-colors last:border-b-0 sm:gap-4",
                  )}
                >
                  <Link
                    href={`/stock/${symbol}`}
                    className="inline-flex cursor-pointer items-center gap-2 transition-colors hover:text-primary"
                  >
                    <Star className="h-3 w-3 text-primary/60" aria-hidden />
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {symbol}
                    </span>
                    {quote && <span className="badge-ticker">{quote.exchange.slice(0, 8)}</span>}
                  </Link>
                  <span className="hidden truncate text-muted-foreground sm:block">
                    {loading ? <SkeletonBlock className="h-3 w-32" /> : (quote?.name ?? "—")}
                  </span>
                  <span className="text-right font-mono tabular-nums text-foreground">
                    {loading ? (
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
                    {loading ? (
                      <SkeletonBlock className="h-4 w-14" />
                    ) : quote ? (
                      formatPercent(quote.changePercent)
                    ) : (
                      "—"
                    )}
                  </span>
                  <span className="text-right font-mono tabular-nums text-muted-foreground">
                    {loading ? (
                      <SkeletonBlock className="ml-auto h-4 w-14" />
                    ) : quote?.marketCap != null ? (
                      formatCompactMoney(quote.marketCap, quote.currency)
                    ) : (
                      "—"
                    )}
                  </span>
                </motion.li>
              );
            })}
          </ul>

          {/* Soft fade to suggest more rows */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card/90 to-transparent"
            aria-hidden
          />
        </div>

        <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
              <LogIn className="h-4 w-4 text-primary" aria-hidden />
            </span>
            <p className="text-sm text-foreground">
              Sign in to start building your own watchlist.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/auth/signin?next=/watchlist"
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-px"
            >
              Sign in with Google
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border/70 bg-card/60 px-3 text-xs font-medium text-foreground transition-colors hover:bg-card"
            >
              See plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
