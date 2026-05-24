"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/lib/utils/format";

interface Bar {
  label: string;
  value: number | null;
  /** Optional secondary value rendered above bar (e.g. growth %). */
  hint?: string | null;
}

interface Props {
  data: Bar[];
  /** Override the y-axis prefix (default "$"). */
  prefix?: string;
  className?: string;
}

/**
 * Vertical bar chart drawn in pure SVG. Animates from 0 → value on mount.
 * Used for revenue / net income / EBITDA / FCF visualizations.
 */
export function RevenueBars({ data, prefix = "$", className }: Props) {
  if (data.length === 0) {
    return (
      <div className={cn("glass flex items-center justify-center rounded-xl px-4 py-10 text-xs text-muted-foreground", className)}>
        No data available
      </div>
    );
  }

  const max = Math.max(0, ...data.map((b) => b.value ?? 0));
  const safeMax = max <= 0 ? 1 : max * 1.1;

  return (
    <div className={cn("flex h-full flex-col gap-2", className)}>
      <div className="flex h-48 items-end gap-2">
        {data.map((b, i) => {
          const heightPct = b.value == null ? 0 : Math.max(2, (b.value / safeMax) * 100);
          return (
            <div key={`${b.label}-${i}`} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end justify-center">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full rounded-sm bg-gradient-to-t from-primary/40 to-primary/80"
                  style={{ minHeight: 2 }}
                  aria-label={`${b.label} ${b.value != null ? formatCompact(b.value) : "-"}`}
                />
              </div>
              <div className="flex flex-col items-center leading-tight">
                <span className="font-mono text-[10px] tabular-nums text-foreground">
                  {b.value != null ? `${prefix}${formatCompact(b.value)}` : "-"}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  {b.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
