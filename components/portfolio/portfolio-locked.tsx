"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Crown,
  LogIn,
  Sparkles,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Portfolio "what you'd get" preview shown to guests and free users.
 * Renders a static, blurred sample portfolio so the user can see what
 * the real product looks like before paying.
 */
export function PortfolioLocked({ variant }: { variant: "guest" | "free" }) {
  const isFree = variant === "free";
  const ctaHref = isFree ? "/pricing" : "/auth/signin?next=/portfolio";
  const ctaLabel = isFree ? "Upgrade to Pro" : "Sign in to continue";
  const CtaIcon = isFree ? Crown : LogIn;

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
                <Wallet className="h-4 w-4 text-primary" aria-hidden />
              </span>
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                {isFree ? "Portfolio is a Pro feature" : "Track your real portfolio"}
              </h2>
            </div>
            <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
              Add positions manually or drop in a broker CSV. We&rsquo;ll calculate
              cost-basis P&L on every lot, aggregate by currency, and refresh quotes
              every minute. Multi-exchange — US, India, Sri Lanka, UK, crypto.
            </p>
            <ul className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-primary" aria-hidden />
                Live cost-basis P&L
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Upload className="h-3 w-3 text-primary" aria-hidden />
                CSV import (Robinhood, Schwab, custom)
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" aria-hidden />
                Per-currency aggregates
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <Link
              href={ctaHref}
              className="group inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <CtaIcon className="h-4 w-4" aria-hidden />
              {ctaLabel}
            </Link>
            <span className="text-[10px] text-muted-foreground">
              {isFree
                ? "Cancel anytime · founder pricing"
                : "Sign in first · then upgrade to Pro"}
            </span>
          </div>
        </div>
      </section>

      {/* Preview cards */}
      <section aria-label="Sample portfolio" className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
              See what your dashboard looks like
            </h3>
            <p className="text-xs text-muted-foreground">
              The numbers below are sample data. Yours will be live and yours alone.
            </p>
          </div>
          <span className="hint-chip">
            <Sparkles className="h-3 w-3 text-primary" aria-hidden />
            Preview
          </span>
        </div>

        <SampleSummary />

        <SampleHoldings />
      </section>
    </div>
  );
}

/* --------------------------------------------- sample components -------- */

function SampleSummary() {
  // Static values picked to feel realistic
  const totals = [
    { currency: "USD", marketValue: 87_420, costBasis: 62_300, unrealizedPL: 25_120, unrealizedPLPct: 40.3, dayChange: 924 },
    { currency: "INR", marketValue: 412_000, costBasis: 380_000, unrealizedPL: 32_000, unrealizedPLPct: 8.4, dayChange: -1_180 },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {totals.map((t, i) => (
        <motion.div
          key={t.currency}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className="glass rounded-2xl p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t.currency} portfolio
            </span>
            <span className="font-mono text-[10px] text-muted-foreground/70">sample</span>
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-foreground">
            {t.currency === "USD" ? "$" : "₹"}
            {t.marketValue.toLocaleString()}
          </p>
          <p
            className={cn(
              "mt-1 inline-flex items-center gap-1 font-mono text-sm tabular-nums",
              t.unrealizedPL >= 0 ? "text-bull" : "text-bear",
            )}
          >
            {t.unrealizedPL >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {t.unrealizedPL >= 0 ? "+" : ""}
            {t.unrealizedPL.toLocaleString()} ({t.unrealizedPLPct.toFixed(1)}%)
          </p>
        </motion.div>
      ))}
    </div>
  );
}

function SampleHoldings() {
  const rows = [
    { sym: "AAPL", name: "Apple Inc.", shares: 50, cost: 152, price: 224.31, pl: 3615 },
    { sym: "NVDA", name: "NVIDIA Corporation", shares: 25, cost: 78, price: 138.92, pl: 1523 },
    { sym: "MSFT", name: "Microsoft", shares: 18, cost: 240, price: 421.85, pl: 3273 },
    { sym: "RELIANCE.NS", name: "Reliance Industries", shares: 100, cost: 2850, price: 1335.2, pl: -151_480 },
    { sym: "BTC-USD", name: "Bitcoin", shares: 0.3, cost: 42_000, price: 78_140, pl: 10_842 },
  ];
  return (
    <div className="glass relative overflow-hidden rounded-2xl">
      {/* Soft blur veil */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent" aria-hidden />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-card/40 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-4 py-2.5 text-left">Symbol</th>
              <th className="px-4 py-2.5 text-left">Name</th>
              <th className="px-4 py-2.5 text-right">Shares</th>
              <th className="px-4 py-2.5 text-right">Cost</th>
              <th className="px-4 py-2.5 text-right">Price</th>
              <th className="px-4 py-2.5 text-right">P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sym} className="border-b border-border/30 last:border-b-0">
                <td className="px-4 py-3 font-mono font-semibold text-foreground">{r.sym}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.name}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{r.shares}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{r.cost.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{r.price.toLocaleString()}</td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-mono tabular-nums",
                    r.pl >= 0 ? "text-bull" : "text-bear",
                  )}
                >
                  {r.pl >= 0 ? "+" : ""}
                  {r.pl.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
