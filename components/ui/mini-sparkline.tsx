import { cn } from "@/lib/utils";

interface Props {
  values: readonly number[];
  className?: string;
  /** Force tone; otherwise inferred from first vs last value. */
  tone?: "bull" | "bear" | "neutral";
  /** Aspect ratio inside SVG viewBox. */
  width?: number;
  height?: number;
}

/**
 * Lightweight SVG sparkline. No external dependency, scales via viewBox.
 * Used inside MetricCard to show context without paying for recharts/d3.
 */
export function MiniSparkline({ values, className, tone, width = 100, height = 28 }: Props) {
  if (values.length < 2) {
    return <div className={cn("h-7 w-24", className)} aria-hidden />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);

  const points = values
    .map((v, i) => `${(i * step).toFixed(2)},${(height - ((v - min) / span) * height).toFixed(2)}`)
    .join(" ");

  const inferred: "bull" | "bear" | "neutral" =
    values[values.length - 1] > values[0]
      ? "bull"
      : values[values.length - 1] < values[0]
        ? "bear"
        : "neutral";
  const t = tone ?? inferred;
  const stroke =
    t === "bull"
      ? "hsl(var(--bull))"
      : t === "bear"
        ? "hsl(var(--bear))"
        : "hsl(var(--muted-foreground))";
  const fill =
    t === "bull"
      ? "hsl(var(--bull) / 0.15)"
      : t === "bear"
        ? "hsl(var(--bear) / 0.15)"
        : "hsl(var(--muted-foreground) / 0.1)";

  // Build closed area path for fill
  const areaPath = `M0,${height} L${points.replace(/\s+/g, " L")} L${width},${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("h-7 w-24", className)}
      aria-hidden
    >
      <path d={areaPath} fill={fill} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
