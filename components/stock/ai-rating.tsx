"use client";

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  ChevronDown,
  Loader2,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useStockAnalysis, type AIAnalysis, type AIRating as Rating } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { SkeletonBlock } from "@/components/ui/skeleton-block";

interface Props {
  symbol: string;
}

interface RatingTheme {
  label: string;
  text: string;
  bg: string;
  border: string;
  glow: string;
  ring: string;
  icon: typeof TrendingUp;
  pulse: boolean;
}

const THEME: Record<Rating, RatingTheme> = {
  STRONG_BUY: {
    label: "STRONG BUY",
    text: "text-bull",
    bg: "bg-bull/10",
    border: "border-bull/45",
    glow: "shadow-[0_0_36px_-6px_hsl(var(--bull)/0.6),0_0_72px_-12px_hsl(var(--bull)/0.4)]",
    ring: "ring-2 ring-bull/35",
    icon: TrendingUp,
    pulse: true,
  },
  BUY: {
    label: "BUY",
    text: "text-bull",
    bg: "bg-bull/8",
    border: "border-bull/30",
    glow: "shadow-[0_0_24px_-8px_hsl(var(--bull)/0.45)]",
    ring: "ring-1 ring-bull/20",
    icon: TrendingUp,
    pulse: false,
  },
  HOLD: {
    label: "HOLD",
    text: "text-neutral",
    bg: "bg-neutral/10",
    border: "border-neutral/30",
    glow: "shadow-[0_0_24px_-8px_hsl(var(--neutral)/0.4)]",
    ring: "ring-1 ring-neutral/20",
    icon: Minus,
    pulse: false,
  },
  SELL: {
    label: "SELL",
    text: "text-bear",
    bg: "bg-bear/8",
    border: "border-bear/30",
    glow: "shadow-[0_0_24px_-8px_hsl(var(--bear)/0.45)]",
    ring: "ring-1 ring-bear/20",
    icon: TrendingDown,
    pulse: false,
  },
  STRONG_SELL: {
    label: "STRONG SELL",
    text: "text-bear",
    bg: "bg-bear/10",
    border: "border-bear/45",
    glow: "shadow-[0_0_36px_-6px_hsl(var(--bear)/0.6),0_0_72px_-12px_hsl(var(--bear)/0.4)]",
    ring: "ring-2 ring-bear/35",
    icon: TrendingDown,
    pulse: true,
  },
};

export function AIRating({ symbol }: Props) {
  const { data, isLoading, isFetching, isError, refetch } = useStockAnalysis(symbol);

  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!data) return <Skeleton />;

  return <RatingCard symbol={symbol} data={data} isFetching={isFetching} />;
}

/* ---------------------------------------------------------------- card ---- */

function RatingCard({
  symbol,
  data,
  isFetching,
}: {
  symbol: string;
  data: AIAnalysis;
  isFetching: boolean;
}) {
  const theme = THEME[data.rating];
  const Icon = theme.icon;
  const positive = data.upside >= 0;

  return (
    <motion.section
      aria-label="AI analyst rating"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass relative h-full overflow-hidden rounded-2xl p-6"
    >
      {/* Tone-tinted halo */}
      <div
        className={cn(
          "pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full blur-3xl",
          data.rating === "STRONG_BUY" || data.rating === "BUY"
            ? "bg-bull/8"
            : data.rating === "STRONG_SELL" || data.rating === "SELL"
              ? "bg-bear/8"
              : "bg-neutral/6",
        )}
        aria-hidden
      />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Brain className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              AI Analyst Rating
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {symbol} · {data.targetHorizon}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="hint-chip">
            <Sparkles className="h-3 w-3 text-primary" aria-hidden />
            {data.model.split("/")[1] ?? data.model}
          </span>
          {isFetching && !data.cached && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden />
              updating
            </span>
          )}
        </div>
      </div>

      {/* Stubbed fallback notice */}
      {data.stubbed && (
        <div className="relative mt-5 flex items-start gap-2 rounded-xl border border-neutral/30 bg-neutral/8 p-3 text-xs text-foreground/85">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral" aria-hidden />
          <span>{data.summary}</span>
        </div>
      )}

      {!data.stubbed && (
        <>
          {/* Badge + gauge + target */}
          <div className="relative mt-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
            {/* Rating badge */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.1 }}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-2 rounded-xl border px-5 py-5 transition-shadow",
                theme.bg,
                theme.border,
                theme.glow,
                theme.ring,
                theme.pulse && "animate-border-glow",
              )}
            >
              <Icon className={cn("h-5 w-5", theme.text)} aria-hidden />
              <span
                className={cn(
                  "font-display text-2xl font-semibold tracking-wide sm:text-3xl",
                  theme.text,
                )}
              >
                {theme.label}
              </span>
            </motion.div>

            {/* Confidence gauge */}
            <ConfidenceGauge value={data.confidence} />

            {/* Price target */}
            <div className="flex flex-col items-center gap-0.5 px-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Price Target
              </span>
              <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
                {formatCurrency(data.priceTarget)}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-mono text-xs tabular-nums",
                  positive ? "text-bull" : "text-bear",
                )}
              >
                {positive ? "▲" : "▼"} {formatPercent(Math.abs(data.upside))} upside
              </span>
            </div>
          </div>

          {/* Summary */}
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className={cn(
              "relative mt-5 border-l-2 pl-4 text-sm leading-relaxed text-foreground/90",
              theme.border,
            )}
          >
            {data.summary}
          </motion.p>

          {/* 3-up context strip */}
          <div className="relative mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <ContextCard label="Valuation" body={data.valuation} index={0} />
            <ContextCard label="Technicals" body={data.technicals} index={1} />
            <ContextCard label="Sector" body={data.sectorContext} index={2} />
          </div>

          {/* Bull / Bear accordions */}
          <div className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CaseAccordion
              tone="bull"
              title="Bull Case"
              points={data.bullCase}
              defaultOpen
            />
            <CaseAccordion tone="bear" title="Bear Case" points={data.bearCase} />
          </div>

          {/* Risks + catalysts chips */}
          <div className="relative mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ChipGroup label="Key Risks" items={data.keyRisks} tone="bear" />
            <ChipGroup label="Catalysts" items={data.catalysts} tone="primary" />
          </div>
        </>
      )}

      {/* Disclaimer */}
      <p className="relative mt-6 border-t border-border/60 pt-3 text-center text-[10px] text-muted-foreground">
        AI-generated analysis · Not financial advice · Always do your own research
        {data.lastUpdated && (
          <span className="ml-1 font-mono">
            · Updated {new Date(data.lastUpdated).toLocaleTimeString()}
          </span>
        )}
        {data.cached && <span className="ml-1">· Cached</span>}
      </p>
    </motion.section>
  );
}

/* -------------------------------------------------- confidence gauge ---- */

function ConfidenceGauge({ value }: { value: number }) {
  const RADIUS = 30;
  const STROKE = 6;
  const C = 2 * Math.PI * RADIUS;
  const SIZE = (RADIUS + STROKE) * 2;

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 18, mass: 0.9 });
  const displayValue = useTransform(spring, (v) => Math.round(v).toString());
  const dashOffset = useTransform(spring, (v) => C - (Math.max(0, Math.min(100, v)) / 100) * C);

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  const tone =
    value >= 70 ? "text-bull" : value >= 40 ? "text-neutral" : "text-muted-foreground";

  return (
    <div className="flex flex-col items-center gap-1 px-2">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={STROKE}
          />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={C}
            style={{ strokeDashoffset: dashOffset, color: "hsl(var(--primary))" }}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span className={cn("font-mono text-base font-semibold tabular-nums", tone)}>
            {displayValue}
          </motion.span>
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Confidence
      </span>
    </div>
  );
}

/* -------------------------------------------------- context card ---- */

function ContextCard({ label, body, index }: { label: string; body: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.3 + index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-border/60 bg-card/40 p-3"
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-foreground/85">{body}</p>
    </motion.div>
  );
}

/* -------------------------------------------------- bull/bear accordion ---- */

function CaseAccordion({
  tone,
  title,
  points,
  defaultOpen = false,
}: {
  tone: "bull" | "bear";
  title: string;
  points: string[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = tone === "bull" ? TrendingUp : TrendingDown;
  const toneClasses =
    tone === "bull"
      ? {
          border: "border-bull/25",
          text: "text-bull",
          bg: "bg-bull/5 hover:bg-bull/8",
          dot: "bg-bull",
        }
      : {
          border: "border-bear/25",
          text: "text-bear",
          bg: "bg-bear/5 hover:bg-bear/8",
          dot: "bg-bear",
        };

  return (
    <div className={cn("overflow-hidden rounded-xl border", toneClasses.border)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-left text-xs font-semibold transition-colors duration-150",
          toneClasses.bg,
          toneClasses.text,
        )}
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {title}
          <span className="text-[10px] font-normal text-muted-foreground">
            {points.length} {points.length === 1 ? "point" : "points"}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          aria-hidden
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-2 px-3 py-3">
              {points.map((p, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed text-foreground/85">
                  <span
                    className={cn("mt-1.5 h-1 w-1 shrink-0 rounded-full", toneClasses.dot)}
                    aria-hidden
                  />
                  <span>{p}</span>
                </li>
              ))}
            </div>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------- chip group ---- */

function ChipGroup({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "bear" | "primary";
}) {
  const chipClass =
    tone === "bear"
      ? "border-bear/25 bg-bear/8 text-bear"
      : "border-primary/30 bg-primary/8 text-primary";
  return (
    <div>
      <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, delay: 0.4 + i * 0.04 }}
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-1 text-[11px] leading-tight",
              chipClass,
            )}
          >
            {item}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------- states ---- */

function Skeleton() {
  return (
    <section
      aria-label="AI analyst rating loading"
      className="glass relative h-full overflow-hidden rounded-2xl p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <SkeletonBlock className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <SkeletonBlock className="h-2.5 w-24" />
            <SkeletonBlock className="h-3 w-32" />
          </div>
        </div>
        <SkeletonBlock className="h-5 w-28 rounded-full" />
      </div>

      <div className="mt-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
        <SkeletonBlock className="h-20 flex-1 rounded-xl" />
        <SkeletonBlock className="h-20 w-20 rounded-full" />
        <SkeletonBlock className="h-20 w-28 rounded-xl" />
      </div>

      <SkeletonBlock className="mt-5 h-12 w-full rounded" />

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <SkeletonBlock className="h-16 rounded-xl" />
        <SkeletonBlock className="h-16 rounded-xl" />
        <SkeletonBlock className="h-16 rounded-xl" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SkeletonBlock className="h-10 rounded-xl" />
        <SkeletonBlock className="h-10 rounded-xl" />
      </div>
    </section>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section
      aria-label="AI analyst rating unavailable"
      className="glass flex h-full flex-col items-center justify-center gap-3 rounded-2xl p-8 text-center"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 ring-1 ring-destructive/30">
        <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
      </div>
      <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
        AI rating unavailable
      </h3>
      <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
        The model service didn&rsquo;t respond. Your other data is unaffected — try once more.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="cursor-pointer rounded-lg border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-card"
      >
        Try again
      </button>
    </section>
  );
}
