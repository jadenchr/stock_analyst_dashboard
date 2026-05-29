"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, CalendarClock, Loader2, Moon, Sun } from "lucide-react";
import { useEarnings, type EarningsEvent } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { SkeletonBlock } from "@/components/ui/skeleton-block";

/* ============================================================
 * EarningsClient
 * ============================================================
 * Upcoming earnings calendar. Date-grouped list of events with
 * BMO/AMC time-of-day chips, EPS estimate (vs. actual if reported),
 * and revenue estimate (compact format).
 *
 * Window picker: next 7 / 14 / 30 days.
 * Click a symbol to jump to its stock detail page.
 */

const DAY_OPTIONS = [
  { value: 7, label: "Next 7 days" },
  { value: 14, label: "Next 14 days" },
  { value: 30, label: "Next 30 days" },
] as const;

export function EarningsClient() {
  const [days, setDays] = useState<number>(14);
  const { data, isLoading, isError } = useEarnings({ days });
  const events = useMemo(() => groupByDate(data?.events ?? []), [data]);
  const total = data?.events.length ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pt-2">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Earnings calendar
          </h1>
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? `${total} earnings reports scheduled in your window.`
            : "Upcoming earnings reports across the US market."}
        </p>

        <div role="radiogroup" aria-label="Window" className="mt-2 inline-flex gap-1.5">
          {DAY_OPTIONS.map((o) => {
            const active = o.value === days;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setDays(o.value)}
                className={cn(
                  "inline-flex h-8 cursor-pointer items-center rounded-full border px-3 text-xs font-medium transition-colors",
                  active
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/70 bg-card/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </header>

      {isError && (
        <div className="glass rounded-xl px-4 py-3 text-sm text-muted-foreground">
          Couldn&rsquo;t load the earnings calendar right now. Try again in a minute.
        </div>
      )}

      {isLoading && events.length === 0 ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="glass flex items-center justify-center rounded-2xl p-10 text-sm text-muted-foreground">
          No earnings reports in the selected window.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {events.map(({ date, items }, gi) => (
            <DateGroup key={date} date={date} items={items} index={gi} />
          ))}
        </div>
      )}
    </div>
  );
}

function DateGroup({
  date,
  items,
  index,
}: {
  date: string;
  items: EarningsEvent[];
  index: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="glass overflow-hidden rounded-2xl"
    >
      <header className="flex items-center justify-between border-b border-border/40 px-4 py-2.5 sm:px-5">
        <h2 className="font-display text-sm font-semibold text-foreground">
          {formatDateHeading(date)}
        </h2>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {items.length} report{items.length === 1 ? "" : "s"}
        </span>
      </header>
      <ul>
        {items.map((e) => (
          <EarningsRow key={`${e.symbol}-${e.date}-${e.quarter ?? ""}`} event={e} />
        ))}
      </ul>
    </motion.section>
  );
}

function EarningsRow({ event }: { event: EarningsEvent }) {
  const hourLabel = hourMeta(event.hour);
  return (
    <li className="flex items-center gap-4 border-b border-border/30 px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/30 sm:px-5">
      <Link
        href={`/stock/${encodeURIComponent(event.symbol)}`}
        className="group flex min-w-0 flex-1 items-center gap-3"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ring-1 ring-border/60">
          {event.symbol.slice(0, 3)}
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-mono text-sm font-semibold tracking-wide text-foreground transition-colors group-hover:text-primary">
            {event.symbol}
            <ArrowUpRight
              className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5",
                hourLabel.className,
              )}
            >
              {hourLabel.icon}
              {hourLabel.label}
            </span>
            {event.quarter && event.year && (
              <span className="font-mono text-[10px] text-muted-foreground/70">
                Q{event.quarter} FY{String(event.year).slice(-2)}
              </span>
            )}
          </p>
        </div>
      </Link>

      <div className="hidden text-right sm:block">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          EPS estimate
        </p>
        <p className="font-mono text-sm tabular-nums text-foreground/90">
          {event.epsEstimate != null ? `$${event.epsEstimate.toFixed(2)}` : "—"}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Revenue est.
        </p>
        <p className="font-mono text-sm tabular-nums text-foreground/90">
          {event.revenueEstimate != null ? formatCompact(event.revenueEstimate) : "—"}
        </p>
      </div>
    </li>
  );
}

/* ----------------- helpers ----------------- */

function groupByDate(events: EarningsEvent[]) {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const map = new Map<string, EarningsEvent[]>();
  for (const e of sorted) {
    if (!map.has(e.date)) map.set(e.date, []);
    map.get(e.date)!.push(e);
  }
  // Within a day, surface AMC/BMO together, then by symbol.
  return Array.from(map.entries()).map(([date, items]) => ({
    date,
    items: items.sort((a, b) => {
      const order: Record<EarningsEvent["hour"], number> = {
        bmo: 0,
        dmt: 1,
        unknown: 2,
        amc: 3,
      };
      const ho = order[a.hour] - order[b.hour];
      return ho !== 0 ? ho : a.symbol.localeCompare(b.symbol);
    }),
  }));
}

function hourMeta(h: EarningsEvent["hour"]) {
  if (h === "bmo") {
    return {
      label: "Before open",
      icon: <Sun className="h-2.5 w-2.5" aria-hidden />,
      className: "border-bull/30 bg-bull/10 text-bull",
    };
  }
  if (h === "amc") {
    return {
      label: "After close",
      icon: <Moon className="h-2.5 w-2.5" aria-hidden />,
      className: "border-primary/30 bg-primary/10 text-primary",
    };
  }
  return {
    label: "Time TBD",
    icon: <CalendarClock className="h-2.5 w-2.5" aria-hidden />,
    className: "border-border/70 bg-card/60 text-muted-foreground",
  };
}

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function formatDateHeading(iso: string): string {
  // iso like "2026-05-30"
  const d = new Date(iso + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  const sameYear = d.getUTCFullYear() === today.getUTCFullYear();
  const opts: Intl.DateTimeFormatOptions = sameYear
    ? { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }
    : { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" };
  return new Intl.DateTimeFormat("en-US", opts).format(d);
}
