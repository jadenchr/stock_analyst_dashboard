"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import Link from "next/link";
import { useQuote } from "@/lib/api/client";
import type { Quote } from "@/lib/market-data/types";
import { classifyTicker } from "@/lib/utils/validators";
import { cn } from "@/lib/utils";
import {
  formatCompact,
  formatCompactMoney,
  formatCurrency,
  formatPercent,
} from "@/lib/utils/format";

interface Props {
  symbol: string;
  initial: Quote | null;
}

const MARKET_STATE_LABEL: Record<Quote["marketState"], { label: string; dot: string; pulse: boolean }> = {
  REGULAR: { label: "Open", dot: "bg-bull", pulse: true },
  PRE: { label: "Pre-Market", dot: "bg-neutral", pulse: false },
  POST: { label: "After Hours", dot: "bg-neutral", pulse: false },
  CLOSED: { label: "Closed", dot: "bg-muted-foreground", pulse: false },
};

export function LivePriceHeader({ symbol, initial }: Props) {
  const { data, isLoading } = useQuote(symbol);
  const q = data ?? initial;

  if (!q) {
    return (
      <header className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="skeleton h-8 w-32 rounded" />
            <div className="skeleton h-3 w-48 rounded" />
          </div>
          <div className="space-y-2 text-right">
            <div className="ml-auto skeleton h-8 w-28 rounded" />
            <div className="ml-auto skeleton h-3 w-16 rounded" />
          </div>
        </div>
      </header>
    );
  }

  const positive = q.changePercent >= 0;
  const Arrow = positive ? ArrowUpRight : ArrowDownRight;
  const state = MARKET_STATE_LABEL[q.marketState];
  const isCSE = classifyTicker(q.symbol) === "LK_CSE";

  const rangePct =
    q.yearHigh != null && q.yearLow != null && q.yearHigh > q.yearLow
      ? Math.min(Math.max((q.price - q.yearLow) / (q.yearHigh - q.yearLow), 0), 1)
      : null;

  return (
    <motion.header
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass relative overflow-hidden rounded-2xl p-6"
    >
      {/* Subtle tone-tinted halo behind the price */}
      <div
        className={cn(
          "pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full blur-3xl transition-colors",
          positive ? "bg-bull/10" : "bg-bear/10",
        )}
        aria-hidden
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
              {q.symbol}
            </h1>
            <span className="badge-ticker">{q.exchange}</span>
            <span className="hint-chip">
              <span className="relative flex h-1.5 w-1.5">
                {state.pulse && (
                  <span
                    className={cn(
                      "absolute inset-0 rounded-full opacity-50",
                      state.dot,
                    )}
                    style={{ animation: "ping 1.8s cubic-bezier(0,0,0.2,1) infinite" }}
                  />
                )}
                <span className={cn("relative h-1.5 w-1.5 rounded-full", state.dot)} />
              </span>
              {state.label}
            </span>
            {isCSE && (
              <Link
                href="/pricing"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-neutral/40 bg-neutral/10 px-2 py-0.5 text-[11px] font-medium text-neutral transition-colors hover:bg-neutral/15"
                title="CSE data on free tier is live quote only — historical and fundamentals available on Pro"
              >
                <Info className="h-3 w-3" aria-hidden />
                Free-tier quote only · Pro unlocks history
              </Link>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{q.name}</p>
        </div>

        <div className="text-right">
          <p
            className={cn(
              "font-mono text-4xl font-semibold tabular-nums text-foreground transition-opacity",
              isLoading && "opacity-80",
            )}
          >
            {formatCurrency(q.price, q.currency)}
          </p>
          <p
            className={cn(
              "mt-1 inline-flex items-center justify-end gap-1 font-mono text-sm tabular-nums",
              positive ? "text-bull" : "text-bear",
            )}
          >
            <Arrow className="h-3.5 w-3.5" aria-hidden />
            {formatCurrency(Math.abs(q.change), q.currency)} ({formatPercent(q.changePercent)})
          </p>
        </div>
      </div>

      {/* 52-week range bar */}
      {rangePct != null && (
        <div className="relative mt-6">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>52w Low {formatCurrency(q.yearLow, q.currency)}</span>
            <span>52w High {formatCurrency(q.yearHigh, q.currency)}</span>
          </div>
          <div className="relative h-1.5 rounded-full bg-muted">
            <div
              className="absolute top-0 h-full rounded-full bg-gradient-to-r from-bear via-neutral to-bull opacity-60"
              style={{ width: "100%" }}
              aria-hidden
            />
            <motion.div
              initial={{ left: 0, opacity: 0 }}
              animate={{ left: `calc(${rangePct * 100}% - 2px)`, opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-full bg-foreground shadow-[0_0_10px_rgba(255,255,255,0.7)]"
              aria-hidden
            />
          </div>
        </div>
      )}

      {/* Stat strip */}
      <dl className="relative mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border/60 pt-4 sm:grid-cols-4 lg:grid-cols-6">
        <Stat label="Market Cap" value={formatCompactMoney(q.marketCap, q.currency)} />
        <Stat label="Volume" value={q.volume != null ? formatCompact(q.volume) : "—"} />
        <Stat label="P/E (TTM)" value={q.peRatio != null ? q.peRatio.toFixed(2) : "—"} />
        <Stat label="EPS" value={q.eps != null ? formatCurrency(q.eps, q.currency) : "—"} />
        <Stat
          label="Day Range"
          value={
            q.dayHigh != null && q.dayLow != null
              ? `${q.dayLow.toFixed(2)} – ${q.dayHigh.toFixed(2)}`
              : "—"
          }
        />
        <Stat label="Currency" value={q.currency} />
      </dl>
    </motion.header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
