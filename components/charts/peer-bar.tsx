"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  /** Current value, 0..max. */
  value: number;
  /** Peer/sector median for comparison. */
  median?: number;
  /** Upper bound for the visual scale. */
  max?: number;
  /** Optional label rendered to the left. */
  label?: string;
  /** Value-formatter override. */
  format?: (v: number) => string;
  className?: string;
}

const DEFAULT_MAX = 50;

/**
 * Horizontal bar comparing a metric to a peer median. Used inside the
 * Valuation tab where every ratio shows context vs sector.
 */
export function PeerBar({
  value,
  median,
  max = DEFAULT_MAX,
  label,
  format = (v) => v.toFixed(2),
  className,
}: Props) {
  const clamped = Math.max(0, Math.min(value, max));
  const pct = (clamped / max) * 100;
  const medianPct = median != null ? Math.max(0, Math.min(median, max)) / max * 100 : null;

  const positionGood = median != null && value < median;
  const tone = positionGood ? "text-bull" : median != null && value > median ? "text-bear" : "text-foreground";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {label && <span className="w-16 text-[11px] text-muted-foreground">{label}</span>}
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/60 to-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
        {medianPct != null && (
          <span
            className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-muted-foreground/70"
            style={{ left: `${medianPct}%` }}
            aria-hidden
            title="Sector median"
          />
        )}
      </div>
      <span className={cn("w-14 text-right font-mono text-xs tabular-nums", tone)}>{format(value)}</span>
    </div>
  );
}
