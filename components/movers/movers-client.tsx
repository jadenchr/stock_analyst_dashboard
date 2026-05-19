"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  Flame,
  Loader2,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useMoversExpanded } from "@/lib/api/client";
import type { ScreenerResult } from "@/lib/market-data";
import { cn } from "@/lib/utils";
import { formatCompactMoney, formatCurrency, formatPercent, formatCompact } from "@/lib/utils/format";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SkeletonBlock } from "@/components/ui/skeleton-block";

type Tab = "gainers" | "losers" | "mostActive";
type CapBucket = "all" | "mega" | "large" | "mid" | "small";

const TABS: { id: Tab; label: string; icon: typeof TrendingUp; tone: "bull" | "bear" | "primary" }[] = [
  { id: "gainers", label: "Top Gainers", icon: TrendingUp, tone: "bull" },
  { id: "losers", label: "Top Losers", icon: TrendingDown, tone: "bear" },
  { id: "mostActive", label: "Most Active", icon: Zap, tone: "primary" },
];

const CAP_BUCKETS: { id: CapBucket; label: string; min: number | null; max: number | null }[] = [
  { id: "all", label: "All caps", min: null, max: null },
  { id: "mega", label: "Mega (>$200B)", min: 200_000_000_000, max: null },
  { id: "large", label: "Large ($10B–$200B)", min: 10_000_000_000, max: 200_000_000_000 },
  { id: "mid", label: "Mid ($2B–$10B)", min: 2_000_000_000, max: 10_000_000_000 },
  { id: "small", label: "Small (<$2B)", min: null, max: 2_000_000_000 },
];

function inCap(mc: number | null, bucket: CapBucket): boolean {
  if (bucket === "all") return true;
  if (mc == null) return false;
  const def = CAP_BUCKETS.find((b) => b.id === bucket);
  if (!def) return true;
  if (def.min != null && mc < def.min) return false;
  if (def.max != null && mc >= def.max) return false;
  return true;
}

export function MoversClient() {
  const [tab, setTab] = useState<Tab>("gainers");
  const [cap, setCap] = useState<CapBucket>("all");
  const { data, isLoading, isFetching, isError, refetch } = useMoversExpanded();

  const all = useMemo(() => {
    if (!data) return [];
    return data[tab];
  }, [data, tab]);

  const filtered = useMemo(() => all.filter((r) => inCap(r.marketCap, cap)), [all, cap]);

  const summary = useMemo(() => {
    if (!data) return { gainers: 0, losers: 0, mostActive: 0 };
    return {
      gainers: data.gainers.length,
      losers: data.losers.length,
      mostActive: data.mostActive.length,
    };
  }, [data]);

  return (
    <div className="flex flex-col gap-5">
      {/* Tabs + filter bar */}
      <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-3">
        <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-card/60 p-0.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                  active
                    ? t.tone === "bull"
                      ? "bg-bull/15 text-bull"
                      : t.tone === "bear"
                        ? "bg-bear/15 text-bear"
                        : "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
                aria-pressed={active}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {t.label}
                <span className="ml-1 inline-flex items-center rounded-full bg-card/60 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                  {summary[t.id]}
                </span>
              </button>
            );
          })}
        </div>

        <span className="inline-flex items-center gap-1 pl-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Filter className="h-3 w-3" aria-hidden />
          Market cap
        </span>

        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/70 bg-card/60 p-0.5">
          {CAP_BUCKETS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setCap(b.id)}
              className={cn(
                "cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors duration-150",
                cap === b.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
              aria-pressed={cap === b.id}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="ml-auto inline-flex items-center gap-2 text-[10px] text-muted-foreground">
          {isFetching ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              updating…
            </>
          ) : (
            `${filtered.length} of ${all.length}`
          )}
        </div>
      </div>

      {/* Summary stat strip */}
      <SummaryStrip data={data ?? null} />

      {/* Results */}
      {isLoading && all.length === 0 ? (
        <div className="glass flex flex-col gap-2 rounded-xl p-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-9" />
          ))}
        </div>
      ) : isError ? (
        <div className="glass flex flex-col items-center gap-3 rounded-xl px-6 py-12 text-center">
          <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
          <p className="text-sm text-foreground">Couldn&rsquo;t load movers.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="cursor-pointer rounded-lg border border-border/70 bg-card/60 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-card"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 rounded-xl px-6 py-12 text-center">
          <Flame className="h-5 w-5 text-muted-foreground" aria-hidden />
          <p className="text-sm text-foreground">No stocks match those filters.</p>
          <button
            type="button"
            onClick={() => setCap("all")}
            className="cursor-pointer text-xs text-primary underline-offset-4 hover:underline"
          >
            Reset to all caps
          </button>
        </div>
      ) : (
        <MoversTable rows={filtered} tab={tab} />
      )}
    </div>
  );
}

function MoversTable({ rows, tab }: { rows: ScreenerResult[]; tab: Tab }) {
  const columns: DataTableColumn<ScreenerResult>[] = [
    {
      key: "rank",
      header: "#",
      align: "right",
      render: (_r: ScreenerResult, i: number) => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground/70">{i + 1}</span>
      ),
      className: "w-10",
    },
    {
      key: "symbol",
      header: "Symbol",
      align: "left",
      render: (r) => (
        <Link
          href={`/stock/${r.symbol}`}
          className="inline-flex cursor-pointer items-center gap-2 text-foreground transition-colors hover:text-primary"
        >
          <span className="font-mono font-semibold">{r.symbol}</span>
          <span className="badge-ticker">{r.exchange.slice(0, 8)}</span>
        </Link>
      ),
    },
    {
      key: "name",
      header: "Name",
      align: "left",
      render: (r) => <span className="truncate text-muted-foreground">{r.name}</span>,
      className: "max-w-[260px] truncate",
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      render: (r) => (
        <span className="font-mono tabular-nums">{formatCurrency(r.price, r.currency)}</span>
      ),
    },
    {
      key: "changePercent",
      header: tab === "mostActive" ? "Δ %" : "Change",
      align: "right",
      render: (r) => {
        const positive = r.changePercent >= 0;
        const Arrow = positive ? ArrowUpRight : ArrowDownRight;
        return (
          <span
            className={cn(
              "inline-flex items-center justify-end gap-1 font-mono tabular-nums",
              positive ? "text-bull" : "text-bear",
            )}
          >
            <Arrow className="h-3 w-3" aria-hidden />
            {formatPercent(r.changePercent)}
          </span>
        );
      },
    },
    {
      key: "marketCap",
      header: "Market Cap",
      align: "right",
      render: (r) => (
        <span className="font-mono tabular-nums text-muted-foreground">
          {r.marketCap != null ? formatCompactMoney(r.marketCap, r.currency) : "—"}
        </span>
      ),
    },
    {
      key: "volume",
      header: "Volume",
      align: "right",
      render: (r) => (
        <span className="font-mono tabular-nums text-muted-foreground">
          {r.volume != null ? formatCompact(r.volume) : "—"}
        </span>
      ),
    },
    {
      key: "peRatio",
      header: "P/E",
      align: "right",
      render: (r) => (
        <span className="font-mono tabular-nums text-muted-foreground">
          {r.peRatio != null ? r.peRatio.toFixed(2) : "—"}
        </span>
      ),
    },
  ];

  return <DataTable columns={columns} rows={rows} rowKey={(r) => r.symbol} empty="No data." />;
}

function SummaryStrip({ data }: { data: { gainers: ScreenerResult[]; losers: ScreenerResult[]; mostActive: ScreenerResult[] } | null }) {
  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const topG = data.gainers[0];
  const topL = data.losers[0];
  const topA = data.mostActive[0];

  // Aggregate stats — average move across the top 25 of each
  const avgGainPct =
    data.gainers.length > 0
      ? data.gainers.reduce((s, r) => s + r.changePercent, 0) / data.gainers.length
      : 0;
  const avgLossPct =
    data.losers.length > 0
      ? data.losers.reduce((s, r) => s + r.changePercent, 0) / data.losers.length
      : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        icon={TrendingUp}
        iconTone="bull"
        label="Top gainer"
        value={topG?.symbol ?? "—"}
        hint={topG ? formatPercent(topG.changePercent) : ""}
        hintTone="bull"
      />
      <StatCard
        icon={TrendingDown}
        iconTone="bear"
        label="Top loser"
        value={topL?.symbol ?? "—"}
        hint={topL ? formatPercent(topL.changePercent) : ""}
        hintTone="bear"
      />
      <StatCard
        icon={Flame}
        iconTone="bull"
        label="Avg top-25 gain"
        value={formatPercent(avgGainPct)}
        valueTone="bull"
      />
      <StatCard
        icon={Zap}
        iconTone="primary"
        label="Most active"
        value={topA?.symbol ?? "—"}
        hint={topA?.volume != null ? `${formatCompact(topA.volume)} shares` : ""}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconTone,
  label,
  value,
  hint,
  valueTone,
  hintTone,
}: {
  icon: typeof TrendingUp;
  iconTone: "bull" | "bear" | "primary";
  label: string;
  value: string;
  hint?: string;
  valueTone?: "bull" | "bear";
  hintTone?: "bull" | "bear";
}) {
  const iconClass =
    iconTone === "bull"
      ? "bg-bull/10 text-bull ring-bull/30"
      : iconTone === "bear"
        ? "bg-bear/10 text-bear ring-bear/30"
        : "bg-primary/10 text-primary ring-primary/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="glass flex flex-col gap-2 rounded-xl p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg ring-1", iconClass)}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <span
        className={cn(
          "font-mono text-lg font-semibold tabular-nums",
          valueTone === "bull" && "text-bull",
          valueTone === "bear" && "text-bear",
          !valueTone && "text-foreground",
        )}
      >
        {value}
      </span>
      {hint && (
        <span
          className={cn(
            "font-mono text-[11px] tabular-nums",
            hintTone === "bull" && "text-bull",
            hintTone === "bear" && "text-bear",
            !hintTone && "text-muted-foreground",
          )}
        >
          {hint}
        </span>
      )}
    </motion.div>
  );
}
