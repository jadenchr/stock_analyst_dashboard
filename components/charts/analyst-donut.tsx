"use client";

import { motion } from "framer-motion";

interface Props {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

const SEGMENTS = [
  { id: "strongBuy", label: "Strong Buy", color: "hsl(160 100% 50%)" },
  { id: "buy", label: "Buy", color: "hsl(160 70% 55%)" },
  { id: "hold", label: "Hold", color: "hsl(41 100% 70%)" },
  { id: "sell", label: "Sell", color: "hsl(15 95% 60%)" },
  { id: "strongSell", label: "Strong Sell", color: "hsl(350 100% 62%)" },
] as const;

/**
 * SVG donut chart for analyst consensus. The center renders the total
 * count and the dominant recommendation label.
 */
export function AnalystDonut(props: Props) {
  const counts: Record<string, number> = {
    strongBuy: props.strongBuy,
    buy: props.buy,
    hold: props.hold,
    sell: props.sell,
    strongSell: props.strongSell,
  };
  const total = SEGMENTS.reduce((s, seg) => s + (counts[seg.id] ?? 0), 0);

  const radius = 56;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  // Dominant recommendation
  const dominant = SEGMENTS.reduce(
    (acc, seg) => ((counts[seg.id] ?? 0) > acc.value ? { id: seg.id, label: seg.label, value: counts[seg.id] ?? 0 } : acc),
    { id: "hold", label: "Hold", value: -1 },
  );

  let offsetAcc = 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 140 140" className="-rotate-90">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
          {total > 0 &&
            SEGMENTS.map((seg, i) => {
              const value = counts[seg.id] ?? 0;
              if (value === 0) return null;
              const fraction = value / total;
              const length = fraction * circumference;
              const dashOffset = -offsetAcc;
              offsetAcc += length;
              return (
                <motion.circle
                  key={seg.id}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${length} ${circumference}`}
                  strokeLinecap="butt"
                  initial={{ strokeDashoffset: dashOffset + circumference }}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">{total}</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Analysts</span>
        </div>
      </div>

      {/* Legend */}
      <ul className="flex flex-1 flex-col gap-1.5 text-xs">
        {SEGMENTS.map((seg) => {
          const value = counts[seg.id] ?? 0;
          const pct = total > 0 ? (value / total) * 100 : 0;
          const isDominant = total > 0 && seg.id === dominant.id;
          return (
            <li key={seg.id} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: seg.color }}
                aria-hidden
              />
              <span className={isDominant ? "font-medium text-foreground" : "text-muted-foreground"}>{seg.label}</span>
              <span className="ml-auto font-mono tabular-nums text-foreground">{value}</span>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {pct.toFixed(0)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
