"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Briefcase } from "lucide-react";
import { useInsider } from "@/lib/api/client";
import type { InsiderTx } from "@/lib/market-data/types";
import { cn } from "@/lib/utils";
import { formatCompact, formatTimeAgo } from "@/lib/utils/format";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

interface Props {
  symbol: string;
}

export function InsiderFeed({ symbol }: Props) {
  const { data, isLoading, isError } = useInsider(symbol);
  const rows = data ?? [];

  return (
    <section aria-label="Insider transactions" className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl tracking-tight text-foreground">Insider activity</h2>
        <p className="text-xs text-muted-foreground">
          Recent Form 4 / 144 filings · executives buying or selling shares
        </p>
      </div>

      {isLoading && rows.length === 0 ? (
        <div className="glass flex flex-col gap-3 rounded-xl p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="glass rounded-xl px-4 py-3 text-xs text-muted-foreground">
          Insider feed is temporarily unavailable.
        </div>
      ) : rows.length === 0 ? (
        <div className="glass flex items-center gap-3 rounded-xl px-4 py-3 text-xs text-muted-foreground">
          <Briefcase className="h-4 w-4" aria-hidden />
          No insider transactions on file in the recent window.
        </div>
      ) : (
        <InsiderContent rows={rows} />
      )}
    </section>
  );
}

function InsiderContent({ rows }: { rows: InsiderTx[] }) {
  // Aggregate totals for the headline
  let buyShares = 0;
  let sellShares = 0;
  let buyValue = 0;
  let sellValue = 0;
  for (const r of rows) {
    if (r.transaction === "buy") {
      buyShares += r.shares ?? 0;
      buyValue += r.value ?? 0;
    } else if (r.transaction === "sell") {
      sellShares += r.shares ?? 0;
      sellValue += r.value ?? 0;
    }
  }
  const netShares = buyShares - sellShares;

  const columns: DataTableColumn<InsiderTx>[] = [
    {
      key: "date",
      header: "Date",
      align: "left",
      render: (r) => (
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {r.date}
        </span>
      ),
    },
    {
      key: "name",
      header: "Insider",
      align: "left",
      render: (r) => <span className="truncate text-foreground">{r.name}</span>,
      className: "max-w-[200px] truncate",
    },
    {
      key: "transaction",
      header: "Action",
      align: "left",
      render: (r) => (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
            r.transaction === "buy" && "border-bull/30 bg-bull/10 text-bull",
            r.transaction === "sell" && "border-bear/30 bg-bear/10 text-bear",
            r.transaction === "other" && "border-border/70 bg-muted/40 text-muted-foreground",
          )}
        >
          {r.transaction === "buy" ? (
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          ) : r.transaction === "sell" ? (
            <ArrowDownRight className="h-3 w-3" aria-hidden />
          ) : null}
          {r.transaction}
        </span>
      ),
    },
    {
      key: "shares",
      header: "Shares",
      align: "right",
      render: (r) => (
        <span className="font-mono tabular-nums">
          {r.shares == null ? "-" : formatCompact(r.shares)}
        </span>
      ),
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      render: (r) => (
        <span className="font-mono tabular-nums text-muted-foreground">
          {r.price == null ? "-" : `$${r.price.toFixed(2)}`}
        </span>
      ),
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      render: (r) => (
        <span
          className={cn(
            "font-mono tabular-nums",
            r.transaction === "buy" ? "text-bull" : r.transaction === "sell" ? "text-bear" : "text-foreground",
          )}
        >
          {r.value == null ? "-" : `$${formatCompact(r.value)}`}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Summary strip */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <SummaryCard
          label="Buys"
          value={`${formatCompact(buyShares)} sh`}
          hint={buyValue > 0 ? `$${formatCompact(buyValue)} value` : undefined}
          tone="bull"
        />
        <SummaryCard
          label="Sells"
          value={`${formatCompact(sellShares)} sh`}
          hint={sellValue > 0 ? `$${formatCompact(sellValue)} value` : undefined}
          tone="bear"
        />
        <SummaryCard
          label="Net"
          value={`${netShares >= 0 ? "+" : ""}${formatCompact(netShares)} sh`}
          tone={netShares >= 0 ? "bull" : "bear"}
        />
        <SummaryCard
          label="Transactions"
          value={String(rows.length)}
          hint={`Most recent ${formatTimeAgo(rows[0]?.date ?? new Date().toISOString())}`}
        />
      </motion.div>

      <DataTable
        columns={columns}
        rows={rows.slice(0, 12)}
        rowKey={(r, i) => `${r.date}-${r.name}-${i}`}
        empty="No transactions recorded"
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "bull" | "bear" | "default";
}) {
  return (
    <div className="glass flex flex-col gap-1 rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "font-mono text-base font-semibold tabular-nums",
          tone === "bull" && "text-bull",
          tone === "bear" && "text-bear",
          tone === "default" && "text-foreground",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
