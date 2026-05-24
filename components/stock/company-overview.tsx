"use client";

import { motion } from "framer-motion";
import {
  Briefcase,
  Building2,
  Calendar,
  Factory,
  Globe2,
  Loader2,
  MapPin,
  TrendingUp,
  User as UserIcon,
  Users,
} from "lucide-react";
import { useFundamentals, useQuote } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { formatCompactMoney, formatCurrency, formatPercent } from "@/lib/utils/format";

/* ============================================================
 * CompanyOverview — Perplexity Finance-style stock summary.
 * ============================================================
 * Two-column layout under the price header:
 *
 *   ┌──────────────────────────────────────┬─────────────────┐
 *   │ Key stats grid                       │ Company info    │
 *   │  Prev Close / Mkt Cap / Open         │  Symbol         │
 *   │  P/E         / Day Range / Div Yield │  IPO Date       │
 *   │  52W Range   / EPS       / Volume    │  CEO            │
 *   │                                      │  Employees      │
 *   │                                      │  Sector / Ind.  │
 *   │                                      │  Country / Exch.│
 *   │                                      │  Description    │
 *   └──────────────────────────────────────┴─────────────────┘
 *
 * Data sources:
 *   • Key stats   → live quote (price, day range, volume, mkt cap, eps)
 *   • Multiples   → fundamentals (P/E, P/S, dividend yield)
 *   • Company info→ fundamentals.profile (Yahoo assetProfile module)
 */

interface Props {
  symbol: string;
}

export function CompanyOverview({ symbol }: Props) {
  const { data: quote, isLoading: qLoading } = useQuote(symbol);
  const { data: fundamentals, isLoading: fLoading } = useFundamentals(symbol);
  const isLoading = qLoading || fLoading;

  const profile = fundamentals?.profile;
  const currency = quote?.currency ?? "USD";

  return (
    <section
      aria-label="Company overview"
      className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]"
    >
      {/* Left — key stats */}
      <div className="glass relative overflow-hidden rounded-2xl p-5">
        <header className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <TrendingUp className="h-3.5 w-3.5 text-primary" aria-hidden />
            </span>
            <h3 className="text-sm font-semibold text-foreground">Key stats</h3>
          </div>
          {isLoading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
          )}
        </header>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Stat label="Prev Close" value={quote?.previousClose != null ? formatCurrency(quote.previousClose, currency) : "—"} />
          <Stat label="Market Cap" value={quote?.marketCap != null ? formatCompactMoney(quote.marketCap, currency) : "—"} />
          <Stat
            label="Open"
            value={quote?.open != null ? formatCurrency(quote.open, currency) : "—"}
          />
          <Stat
            label="P/E Ratio"
            value={fundamentals?.valuation.peTrailing != null ? fundamentals.valuation.peTrailing.toFixed(2) : "—"}
          />
          <Stat
            label="Day Range"
            value={
              quote?.dayLow != null && quote?.dayHigh != null
                ? `${formatCurrency(quote.dayLow, currency)} – ${formatCurrency(quote.dayHigh, currency)}`
                : "—"
            }
          />
          <Stat
            label="Dividend Yield"
            value={
              fundamentals?.dividend.yield != null
                ? formatPercent(fundamentals.dividend.yield * 100)
                : "—"
            }
          />
          <Stat
            label="52W Range"
            value={
              quote?.yearLow != null && quote?.yearHigh != null
                ? `${formatCurrency(quote.yearLow, currency)} – ${formatCurrency(quote.yearHigh, currency)}`
                : "—"
            }
          />
          <Stat label="EPS" value={quote?.eps != null ? formatCurrency(quote.eps, currency) : "—"} />
          <Stat label="Volume" value={quote?.volume != null ? formatCompact(quote.volume) : "—"} />
        </div>

        {/* 52-week range visualizer — shows where the current price sits */}
        {quote?.yearLow != null && quote?.yearHigh != null && quote?.price != null && (
          <YearRangeBar
            low={quote.yearLow}
            high={quote.yearHigh}
            current={quote.price}
            currency={currency}
          />
        )}
      </div>

      {/* Right — company info sidebar */}
      <aside className="glass relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5">
        <header className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden />
          </span>
          <h3 className="text-sm font-semibold text-foreground">Company</h3>
        </header>

        <dl className="grid grid-cols-1 gap-2 text-xs">
          <InfoRow icon={Briefcase} label="Symbol" value={symbol} mono />
          <InfoRow icon={Calendar} label="IPO Date" value={profile?.ipoDate ?? "—"} />
          <InfoRow icon={UserIcon} label="CEO" value={profile?.ceo ?? "—"} />
          <InfoRow
            icon={Users}
            label="Employees"
            value={
              profile?.fullTimeEmployees != null ? formatCompact(profile.fullTimeEmployees) : "—"
            }
          />
          <InfoRow icon={Factory} label="Sector" value={profile?.sector ?? "—"} />
          <InfoRow icon={Factory} label="Industry" value={profile?.industry ?? "—"} />
          <InfoRow icon={MapPin} label="Country" value={profile?.country ?? "—"} />
          <InfoRow icon={Globe2} label="Exchange" value={quote?.exchange ?? "—"} />
        </dl>

        {profile?.longBusinessSummary && (
          <BusinessSummary text={profile.longBusinessSummary} />
        )}
      </aside>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-1.5 last:border-b-0 last:pb-0">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </span>
      <span
        className={cn(
          "max-w-[60%] truncate text-right text-foreground/90",
          mono && "font-mono font-semibold",
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function BusinessSummary({ text }: { text: string }) {
  // Trim to a comfortable 4-line summary; full text shown on hover via title.
  const trimmed = text.length > 380 ? text.slice(0, 380).trimEnd() + "…" : text;
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="border-t border-border/40 pt-3 text-[11px] leading-relaxed text-muted-foreground"
      title={text}
    >
      {trimmed}
    </motion.p>
  );
}

function YearRangeBar({
  low,
  high,
  current,
  currency,
}: {
  low: number;
  high: number;
  current: number;
  currency: string;
}) {
  const range = Math.max(0.0001, high - low);
  const pct = Math.max(0, Math.min(100, ((current - low) / range) * 100));
  return (
    <div className="mt-5 border-t border-border/40 pt-4">
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <span>52-week position</span>
        <span className="font-mono normal-case tracking-normal text-foreground/85">
          {formatCurrency(current, currency)}
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-bear via-primary to-bull"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-background"
          initial={{ left: "0%" }}
          animate={{ left: `${pct}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] tabular-nums text-muted-foreground">
        <span>{formatCurrency(low, currency)}</span>
        <span>{formatCurrency(high, currency)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Local helper: shape volume / employee numbers compactly without
   currency formatting. */
function formatCompact(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
}
