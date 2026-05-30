"use client";

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
 * Vertical bar chart in pure CSS. The previous Framer Motion
 * implementation animated `height: ${pct}%` which interpolates
 * unreliably when the bar's parent is `flex-1` inside a flex column -
 * Framer ends up holding the bar at the from-height (0) and never
 * commits the final percentage. CSS transitions handle percentage
 * heights against flex parents correctly, and we keep the staggered
 * appearance via `transition-delay`.
 */
export function RevenueBars({ data, prefix = "$", className }: Props) {
  if (data.length === 0) {
    return (
      <div
        className={cn(
          "glass flex items-center justify-center rounded-xl px-4 py-10 text-xs text-muted-foreground",
          className,
        )}
      >
        No data available
      </div>
    );
  }

  const max = Math.max(
    0,
    ...data.map((b) => (b.value != null && Number.isFinite(b.value) ? b.value : 0)),
  );
  const safeMax = max <= 0 ? 1 : max * 1.1;

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-2", className)}>
      <div className="flex h-48 items-end gap-2">
        {data.map((b, i) => {
          const validValue =
            b.value != null && Number.isFinite(b.value) && b.value > 0;
          const heightPct = validValue
            ? Math.max(4, ((b.value as number) / safeMax) * 100)
            : 0;
          return (
            <div
              key={`${b.label}-${i}`}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div className="relative flex w-full flex-1 items-end justify-center">
                <div
                  className="w-full rounded-sm bg-gradient-to-t from-primary/40 to-primary/85"
                  style={{
                    height: `${heightPct}%`,
                    minHeight: validValue ? 4 : 0,
                    transition: "height 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                    transitionDelay: `${i * 50}ms`,
                  }}
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
