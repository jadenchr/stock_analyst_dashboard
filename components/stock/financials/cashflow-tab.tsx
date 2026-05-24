"use client";

import { RevenueBars } from "@/components/charts/revenue-bars";
import { MetricCard } from "@/components/ui/metric-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { formatCompact } from "@/lib/utils/format";
import type { Financials } from "@/lib/api/client";

interface Props {
  financials: Financials | null;
}

interface CashRow {
  period: string;
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  freeCashFlow: number | null;
}

function fmt(v: number | null): string {
  return v == null ? "-" : `$${formatCompact(v)}`;
}

export function CashflowTab({ financials }: Props) {
  if (!financials) return null;
  const rows = financials.cashflow.annual;
  const chronological = [...rows].reverse();

  // Approximate FCF margin from latest income net
  const latestIncome = financials.income.annual[0];
  const latest = rows[0];

  const fcfYield =
    latestIncome && latest && latestIncome.netIncome && latest.freeCashFlow
      ? (latest.freeCashFlow / latestIncome.netIncome) * 100
      : null;

  const columns: DataTableColumn<CashRow>[] = [
    { key: "period", header: "Period", align: "left" },
    {
      key: "operatingCashFlow",
      header: "Operating CF",
      align: "right",
      render: (r) => <span className="font-mono tabular-nums">{fmt(r.operatingCashFlow)}</span>,
    },
    {
      key: "capitalExpenditure",
      header: "CapEx",
      align: "right",
      render: (r) => (
        <span className="font-mono tabular-nums text-muted-foreground">{fmt(r.capitalExpenditure)}</span>
      ),
    },
    {
      key: "freeCashFlow",
      header: "Free CF",
      align: "right",
      render: (r) => (
        <span className="font-mono tabular-nums text-foreground">{fmt(r.freeCashFlow)}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* FCF bar chart */}
      <div className="glass rounded-xl p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Free cash flow</h3>
        <RevenueBars
          data={chronological.map((r) => ({ label: r.period, value: r.freeCashFlow }))}
        />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          index={0}
          label="Latest Op CF"
          value={latest?.operatingCashFlow ?? null}
          prefix="$"
          tone="default"
        />
        <MetricCard
          index={1}
          label="Latest CapEx"
          value={latest?.capitalExpenditure ?? null}
          prefix="$"
          tone="default"
          hint="Investing outflow"
        />
        <MetricCard
          index={2}
          label="Latest FCF"
          value={latest?.freeCashFlow ?? null}
          prefix="$"
          tone={latest?.freeCashFlow != null && latest.freeCashFlow > 0 ? "bull" : "bear"}
        />
        <MetricCard
          index={3}
          label="FCF / Net Income"
          value={fcfYield}
          format={(x) => `${x.toFixed(0)}%`}
          tone={fcfYield != null && fcfYield > 80 ? "bull" : "neutral"}
          hint="Quality of earnings"
        />
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.period} empty="No annual cash flow statements available" />
    </div>
  );
}
