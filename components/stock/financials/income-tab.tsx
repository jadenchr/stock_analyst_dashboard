"use client";

import { useState } from "react";
import { RevenueBars } from "@/components/charts/revenue-bars";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/lib/utils/format";
import type { Financials } from "@/lib/api/client";

interface Props {
  financials: Financials | null;
}

type Period = "annual" | "quarterly";

interface IncomeRow {
  period: string;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  ebitda: number | null;
  grossMargin: number | null;
  opMargin: number | null;
  netMargin: number | null;
  revGrowth: number | null;
}

function pctOrNull(num: number | null, denom: number | null): number | null {
  if (num == null || denom == null || denom === 0) return null;
  return (num / denom) * 100;
}

function fmtMoney(v: number | null): string {
  if (v == null) return "-";
  return `$${formatCompact(v)}`;
}

function fmtPct(v: number | null): string {
  if (v == null) return "-";
  return `${v.toFixed(1)}%`;
}

export function IncomeTab({ financials }: Props) {
  const [period, setPeriod] = useState<Period>("annual");

  if (!financials) return null;

  const raw = financials.income[period];
  // Yahoo returns most-recent first - reverse for chart, keep newest-first for table
  const chronological = [...raw].reverse();

  // Build derived rows with margins + YoY growth
  const enriched: IncomeRow[] = raw.map((r, i) => {
    const prevRevenue = raw[i + 1]?.revenue ?? null;
    return {
      period: r.period,
      revenue: r.revenue,
      grossProfit: r.grossProfit,
      operatingIncome: r.operatingIncome,
      netIncome: r.netIncome,
      ebitda: r.ebitda,
      grossMargin: pctOrNull(r.grossProfit, r.revenue),
      opMargin: pctOrNull(r.operatingIncome, r.revenue),
      netMargin: pctOrNull(r.netIncome, r.revenue),
      revGrowth: pctOrNull(
        prevRevenue != null && r.revenue != null ? r.revenue - prevRevenue : null,
        prevRevenue,
      ),
    };
  });

  const revenueBars = chronological.map((r) => ({
    label: r.period,
    value: r.revenue,
  }));
  const netIncomeBars = chronological.map((r) => ({
    label: r.period,
    value: r.netIncome,
  }));

  const columns: DataTableColumn<IncomeRow>[] = [
    { key: "period", header: "Period", align: "left" },
    {
      key: "revenue",
      header: "Revenue",
      align: "right",
      render: (r) => (
        <span className="font-mono tabular-nums">{fmtMoney(r.revenue)}</span>
      ),
    },
    {
      key: "revGrowth",
      header: "YoY",
      align: "right",
      render: (r) => (
        <span
          className={cn(
            "font-mono tabular-nums",
            r.revGrowth == null ? "text-muted-foreground" : r.revGrowth > 0 ? "text-bull" : "text-bear",
          )}
        >
          {fmtPct(r.revGrowth)}
        </span>
      ),
    },
    {
      key: "grossProfit",
      header: "Gross",
      align: "right",
      render: (r) => <span className="font-mono tabular-nums">{fmtMoney(r.grossProfit)}</span>,
    },
    {
      key: "grossMargin",
      header: "GM %",
      align: "right",
      render: (r) => (
        <span className="font-mono tabular-nums text-muted-foreground">{fmtPct(r.grossMargin)}</span>
      ),
    },
    {
      key: "operatingIncome",
      header: "Op Income",
      align: "right",
      render: (r) => <span className="font-mono tabular-nums">{fmtMoney(r.operatingIncome)}</span>,
    },
    {
      key: "opMargin",
      header: "Op %",
      align: "right",
      render: (r) => (
        <span className="font-mono tabular-nums text-muted-foreground">{fmtPct(r.opMargin)}</span>
      ),
    },
    {
      key: "netIncome",
      header: "Net Income",
      align: "right",
      render: (r) => <span className="font-mono tabular-nums">{fmtMoney(r.netIncome)}</span>,
    },
    {
      key: "netMargin",
      header: "Net %",
      align: "right",
      render: (r) => (
        <span className="font-mono tabular-nums text-muted-foreground">{fmtPct(r.netMargin)}</span>
      ),
    },
    {
      key: "ebitda",
      header: "EBITDA",
      align: "right",
      render: (r) => <span className="font-mono tabular-nums">{fmtMoney(r.ebitda)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Period toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-card/60 p-0.5 self-start">
        {(["annual", "quarterly"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              "cursor-pointer rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors duration-150",
              period === p
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
            aria-pressed={period === p}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Two bar charts: revenue + net income */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass flex flex-col gap-3 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground">Revenue</h3>
          <RevenueBars data={revenueBars} />
        </div>
        <div className="glass flex flex-col gap-3 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground">Net income</h3>
          <RevenueBars data={netIncomeBars} />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={enriched}
        rowKey={(r) => r.period}
        empty={`No ${period} income statements available`}
      />
    </div>
  );
}
