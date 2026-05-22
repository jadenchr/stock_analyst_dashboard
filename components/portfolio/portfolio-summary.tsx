"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Coins } from "lucide-react";
import type { PortfolioTotals } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { formatCompactMoney, formatCurrency, formatPercent } from "@/lib/utils/format";

interface Props {
  totals: PortfolioTotals[];
}

export function PortfolioSummary({ totals }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {totals.map((t, i) => {
        const positive = t.unrealizedPL >= 0;
        const Arrow = positive ? ArrowUpRight : ArrowDownRight;
        return (
          <motion.div
            key={t.currency}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="glass rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Coins className="h-3 w-3" aria-hidden />
                {t.currency} · {t.holdingsCount} {t.holdingsCount === 1 ? "lot" : "lots"}
              </span>
              <span
                className={cn(
                  "font-mono text-[10px] tabular-nums",
                  t.dayChange >= 0 ? "text-bull" : "text-bear",
                )}
                title="Today's change"
              >
                {t.dayChange >= 0 ? "▲" : "▼"} {formatPercent(Math.abs(t.dayChangePct))} today
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">
                {formatCurrency(t.marketValue, t.currency)}
              </p>
            </div>

            <p
              className={cn(
                "mt-1 inline-flex items-center gap-1 font-mono text-sm tabular-nums",
                positive ? "text-bull" : "text-bear",
              )}
            >
              <Arrow className="h-3.5 w-3.5" aria-hidden />
              {positive ? "+" : ""}
              {formatCurrency(t.unrealizedPL, t.currency)} ({formatPercent(t.unrealizedPLPct)})
            </p>

            <p className="mt-2 text-[11px] text-muted-foreground">
              Cost basis {formatCompactMoney(t.costBasis, t.currency)}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
