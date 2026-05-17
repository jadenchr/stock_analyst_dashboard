"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { AnalystDonut } from "@/components/charts/analyst-donut";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { useAnalysts } from "@/lib/api/client";

interface Props {
  symbol: string;
}

export function AnalystPanel({ symbol }: Props) {
  const { data, isLoading, isError } = useAnalysts(symbol);

  if (isLoading) {
    return (
      <section aria-label="Analyst consensus" className="glass rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-36 w-36 rounded-full" />
          <div className="flex-1 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-3 w-full" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <motion.section
        aria-label="Analyst consensus"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass flex items-center gap-3 rounded-2xl p-5"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted ring-1 ring-border">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Analyst consensus</h3>
          <p className="text-xs text-muted-foreground">
            Not currently published for this ticker.
          </p>
        </div>
      </motion.section>
    );
  }

  const total = data.strongBuy + data.buy + data.hold + data.sell + data.strongSell;
  const bullish = data.strongBuy + data.buy;
  const bullishPct = total > 0 ? Math.round((bullish / total) * 100) : 0;

  return (
    <motion.section
      aria-label="Analyst consensus"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-2xl p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Analyst consensus</h3>
          <p className="text-[11px] text-muted-foreground">
            {total} analyst{total === 1 ? "" : "s"} · {bullishPct}% bullish · as of {data.asOf}
          </p>
        </div>
      </div>
      <AnalystDonut
        strongBuy={data.strongBuy}
        buy={data.buy}
        hold={data.hold}
        sell={data.sell}
        strongSell={data.strongSell}
      />
    </motion.section>
  );
}
