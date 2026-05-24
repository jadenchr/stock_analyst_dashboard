"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Flame,
  Gauge,
  Loader2,
  Lock,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/app/providers";
import type { ScreenerId, ScreenerResult } from "@/lib/market-data";
import { useUser } from "@/app/auth/user-provider";
import { cn } from "@/lib/utils";
import {
  formatCompact,
  formatCompactMoney,
  formatCurrency,
  formatPercent,
} from "@/lib/utils/format";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SkeletonBlock } from "@/components/ui/skeleton-block";

interface Preset {
  id: ScreenerId;
  label: string;
  description: string;
  icon: typeof TrendingUp;
  tone: "bull" | "bear" | "primary" | "neutral";
  proOnly?: boolean;
}

const PRESETS: Preset[] = [
  {
    id: "day_gainers",
    label: "Day Gainers",
    description: "Biggest single-session percentage gains in the US market.",
    icon: TrendingUp,
    tone: "bull",
  },
  {
    id: "day_losers",
    label: "Day Losers",
    description: "Largest one-day declines - often opportunity or breakdown.",
    icon: TrendingDown,
    tone: "bear",
  },
  {
    id: "most_actives",
    label: "Most Active",
    description: "Highest volume names - institutional flow indicator.",
    icon: Zap,
    tone: "primary",
  },
  {
    id: "aggressive_small_caps",
    label: "Aggressive Small Caps",
    description: "Small caps with high beta and rapid earnings growth.",
    icon: Flame,
    tone: "neutral",
  },
  {
    id: "growth_technology_stocks",
    label: "Growth Tech",
    description: "Technology stocks with above-market revenue and EPS growth.",
    icon: Gauge,
    tone: "primary",
  },
  {
    id: "undervalued_large_caps",
    label: "Undervalued Large Caps",
    description: "Big names trading below intrinsic value estimates.",
    icon: TrendingUp,
    tone: "bull",
    proOnly: true,
  },
];

const TONE_MAP = {
  primary: { ring: "ring-primary/30", text: "text-primary", bg: "bg-primary/10" },
  bull: { ring: "ring-bull/30", text: "text-bull", bg: "bg-bull/10" },
  bear: { ring: "ring-bear/30", text: "text-bear", bg: "bg-bear/10" },
  neutral: { ring: "ring-neutral/30", text: "text-neutral", bg: "bg-neutral/10" },
};

export function ScreenerClient() {
  const [active, setActive] = useState<ScreenerId>("day_gainers");
  const { tier, can } = useUser();

  const activePreset = PRESETS.find((p) => p.id === active)!;
  const locked = activePreset.proOnly && !can("screener_pro");

  return (
    <div className="flex flex-col gap-5">
      {/* Preset cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {PRESETS.map((p) => (
          <PresetCard
            key={p.id}
            preset={p}
            active={p.id === active}
            onSelect={() => setActive(p.id)}
            locked={Boolean(p.proOnly) && !can("screener_pro")}
          />
        ))}
      </div>

      {/* Results panel */}
      <ScreenerResults presetId={active} preset={activePreset} locked={!!locked} userTier={tier} />
    </div>
  );
}

function PresetCard({
  preset,
  active,
  onSelect,
  locked,
}: {
  preset: Preset;
  active: boolean;
  onSelect: () => void;
  locked: boolean;
}) {
  const tone = TONE_MAP[preset.tone];
  const Icon = preset.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "glass group relative flex cursor-pointer flex-col items-start gap-2 rounded-xl p-3 text-left transition-all duration-200 ease-out-expo",
        active
          ? "border-primary/50 ring-1 ring-primary/30"
          : "hover:-translate-y-0.5 hover:shadow-elevated",
      )}
      aria-pressed={active}
    >
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg ring-1", tone.bg, tone.ring)}>
        <Icon className={cn("h-4 w-4", tone.text)} aria-hidden />
      </div>
      <p className="text-sm font-semibold text-foreground">{preset.label}</p>
      <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
        {preset.description}
      </p>
      {preset.proOnly && (
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
          {locked ? <Lock className="h-2.5 w-2.5" aria-hidden /> : null}
          Pro
        </span>
      )}
    </button>
  );
}

function ScreenerResults({
  presetId,
  preset,
  locked,
  userTier,
}: {
  presetId: ScreenerId;
  preset: Preset;
  locked: boolean;
  userTier: string;
}) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["screener", presetId] as const,
    queryFn: ({ signal }) => apiGet<ScreenerResult[]>(`/api/screener/${presetId}`, { signal }),
    enabled: !locked,
    staleTime: 60_000,
    refetchInterval: 90_000,
  });

  if (locked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass relative overflow-hidden rounded-2xl border border-primary/25 p-10 text-center"
      >
        <div className="bg-aurora pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <Lock className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <h3 className="font-display text-xl font-semibold tracking-tight">
            {preset.label} is a Pro screen
          </h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Upgrade to Pro to unlock advanced screens powered by valuation models and analyst targets.
          </p>
          <Link
            href="/pricing"
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            View pricing
          </Link>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Current tier: {userTier}
          </p>
        </div>
      </motion.div>
    );
  }

  const columns: DataTableColumn<ScreenerResult>[] = [
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
      header: "Change",
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
          {r.marketCap != null ? formatCompactMoney(r.marketCap, r.currency) : "-"}
        </span>
      ),
    },
    {
      key: "peRatio",
      header: "P/E",
      align: "right",
      render: (r) => (
        <span className="font-mono tabular-nums text-muted-foreground">
          {r.peRatio != null ? r.peRatio.toFixed(2) : "-"}
        </span>
      ),
    },
    {
      key: "volume",
      header: "Volume",
      align: "right",
      render: (r) => (
        <span className="font-mono tabular-nums text-muted-foreground">
          {r.volume != null ? formatCompact(r.volume) : "-"}
        </span>
      ),
    },
  ];

  return (
    <section aria-label={preset.label} className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {preset.label}
          </h2>
          <p className="text-xs text-muted-foreground">{preset.description}</p>
        </div>
        {isFetching && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            updating
          </span>
        )}
      </div>

      {isLoading || !data ? (
        <div className="glass flex flex-col gap-2 rounded-xl p-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-9" />
          ))}
        </div>
      ) : isError ? (
        <div className="glass flex flex-col items-center gap-3 rounded-xl px-6 py-12 text-center">
          <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
          <p className="text-sm text-foreground">Couldn&rsquo;t load this screen.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="cursor-pointer rounded-lg border border-border/70 bg-card/60 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-card"
          >
            Try again
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={data ?? []}
          rowKey={(r) => r.symbol}
          empty="No results."
        />
      )}
    </section>
  );
}
