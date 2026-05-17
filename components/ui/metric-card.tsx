"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { MiniSparkline } from "./mini-sparkline";

interface Props {
  label: string;
  value: number | null;
  /** Optional sub-label like "+2.4%" or "TTM". */
  hint?: string;
  /** Tone for delta/value coloring. */
  tone?: "bull" | "bear" | "neutral" | "default";
  /** Sparkline series — optional. */
  spark?: readonly number[];
  /** Formatter for the numeric value. Defaults to fixed-2 with sign. */
  format?: (v: number) => string;
  /** Suffix appended to value (e.g. "%", "x"). */
  suffix?: string;
  /** Prefix (e.g. "$"). */
  prefix?: string;
  /** Stagger index, used by parent for animation delay. */
  index?: number;
  /** Tooltip explainer. */
  description?: string;
  className?: string;
}

const TONE_COLOR: Record<NonNullable<Props["tone"]>, string> = {
  bull: "text-bull",
  bear: "text-bear",
  neutral: "text-neutral",
  default: "text-foreground",
};

function defaultFormat(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 10_000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return v.toFixed(2);
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  spark,
  format = defaultFormat,
  suffix,
  prefix,
  index = 0,
  description,
  className,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "glass group relative flex flex-col gap-2 rounded-xl p-4 transition-all duration-200 ease-out-expo hover:-translate-y-0.5 hover:border-border hover:bg-card/70 hover:shadow-elevated",
        className,
      )}
      title={description}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        {spark && spark.length > 1 && <MiniSparkline values={spark} tone={tone === "default" ? undefined : tone} />}
      </div>

      <div className="flex items-baseline gap-1">
        {value == null || !Number.isFinite(value) ? (
          <span className="font-mono text-2xl tabular-nums text-muted-foreground">—</span>
        ) : (
          <AnimatedNumber
            value={value}
            format={format}
            prefix={prefix}
            suffix={suffix}
            className={cn(
              "font-mono text-2xl font-semibold tabular-nums leading-none",
              TONE_COLOR[tone],
            )}
          />
        )}
      </div>

      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </motion.div>
  );
}

/* --------------------------------------------------------- animated number */

interface AnimatedNumberProps {
  value: number;
  format: (v: number) => string;
  prefix?: string;
  suffix?: string;
  className?: string;
}

function AnimatedNumber({ value, format, prefix, suffix, className }: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 120, damping: 22, mass: 0.8 });
  const display = useTransform(spring, (v) => `${prefix ?? ""}${format(v)}${suffix ?? ""}`);

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  return <motion.span className={className}>{display}</motion.span>;
}
