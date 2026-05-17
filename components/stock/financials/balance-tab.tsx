"use client";

import { motion } from "framer-motion";
import { MetricCard } from "@/components/ui/metric-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { formatCompact } from "@/lib/utils/format";
import type { Financials } from "@/lib/api/client";
import type { Fundamentals } from "@/lib/market-data/types";

interface Props {
  financials: Financials | null;
  fundamentals: Fundamentals | null;
}

interface BalanceRow {
  period: string;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  cashAndEquivalents: number | null;
  totalDebt: number | null;
}

function fmt(v: number | null): string {
  return v == null ? "—" : `$${formatCompact(v)}`;
}

export function BalanceTab({ financials, fundamentals }: Props) {
  if (!financials) return null;
  const rows = financials.balance.annual;
  const latest = rows[0];

  const columns: DataTableColumn<BalanceRow>[] = [
    { key: "period", header: "Period", align: "left" },
    { key: "totalAssets", header: "Total Assets", align: "right", render: (r) => <span className="font-mono tabular-nums">{fmt(r.totalAssets)}</span> },
    { key: "totalLiabilities", header: "Total Liabilities", align: "right", render: (r) => <span className="font-mono tabular-nums">{fmt(r.totalLiabilities)}</span> },
    { key: "totalEquity", header: "Equity", align: "right", render: (r) => <span className="font-mono tabular-nums">{fmt(r.totalEquity)}</span> },
    { key: "cashAndEquivalents", header: "Cash", align: "right", render: (r) => <span className="font-mono tabular-nums">{fmt(r.cashAndEquivalents)}</span> },
    { key: "totalDebt", header: "Debt", align: "right", render: (r) => <span className="font-mono tabular-nums">{fmt(r.totalDebt)}</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Assets vs Liabilities visualization */}
      {latest && (
        <div className="glass rounded-xl p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Capital structure · {latest.period}
          </h3>
          <CapitalStructureBars
            assets={latest.totalAssets ?? 0}
            liabilities={latest.totalLiabilities ?? 0}
            equity={latest.totalEquity ?? 0}
          />
        </div>
      )}

      {/* Ratio cards from fundamentals */}
      {fundamentals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <MetricCard
            index={0}
            label="Debt / Equity"
            value={fundamentals.balanceSheet.debtToEquity}
            format={(x) => x.toFixed(2)}
            tone={
              fundamentals.balanceSheet.debtToEquity == null
                ? "default"
                : fundamentals.balanceSheet.debtToEquity > 200
                  ? "bear"
                  : fundamentals.balanceSheet.debtToEquity > 100
                    ? "neutral"
                    : "bull"
            }
          />
          <MetricCard
            index={1}
            label="Current Ratio"
            value={fundamentals.balanceSheet.currentRatio}
            format={(x) => x.toFixed(2)}
            tone={
              fundamentals.balanceSheet.currentRatio == null
                ? "default"
                : fundamentals.balanceSheet.currentRatio > 1.5
                  ? "bull"
                  : fundamentals.balanceSheet.currentRatio < 1
                    ? "bear"
                    : "neutral"
            }
          />
          <MetricCard
            index={2}
            label="Quick Ratio"
            value={fundamentals.balanceSheet.quickRatio}
            format={(x) => x.toFixed(2)}
            tone={
              fundamentals.balanceSheet.quickRatio == null
                ? "default"
                : fundamentals.balanceSheet.quickRatio > 1
                  ? "bull"
                  : "neutral"
            }
          />
          <MetricCard
            index={3}
            label="Total Cash"
            value={fundamentals.balanceSheet.totalCash}
            prefix="$"
            tone="default"
          />
          <MetricCard
            index={4}
            label="Total Debt"
            value={fundamentals.balanceSheet.totalDebt}
            prefix="$"
            tone="default"
          />
        </div>
      )}

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.period} empty="No annual balance sheets available" />
    </div>
  );
}

function CapitalStructureBars({
  assets,
  liabilities,
  equity,
}: {
  assets: number;
  liabilities: number;
  equity: number;
}) {
  const total = Math.max(assets, liabilities + equity, 1);
  const liabPct = (liabilities / total) * 100;
  const equityPct = (equity / total) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">Total Assets</span>
        <span className="font-mono tabular-nums text-foreground">${formatCompact(assets)}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-primary/40 to-primary/80"
        />
      </div>
      <div className="flex items-baseline justify-between gap-2 pt-3 text-xs">
        <span className="text-muted-foreground">Liabilities + Equity</span>
        <span className="font-mono tabular-nums text-foreground">${formatCompact(liabilities + equity)}</span>
      </div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${liabPct}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="h-full bg-bear/70"
          title={`Liabilities $${formatCompact(liabilities)}`}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${equityPct}%` }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="h-full bg-bull/70"
          title={`Equity $${formatCompact(equity)}`}
        />
      </div>
      <div className="flex items-center gap-4 pt-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-bear/70" /> Liabilities ${formatCompact(liabilities)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-bull/70" /> Equity ${formatCompact(equity)}
        </span>
      </div>
    </div>
  );
}
