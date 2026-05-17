"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { SectionTabs } from "@/components/ui/section-tabs";
import { useFinancials, useFundamentals, type Financials } from "@/lib/api/client";
import { ValuationTab } from "./financials/valuation-tab";
import { IncomeTab } from "./financials/income-tab";
import { BalanceTab } from "./financials/balance-tab";
import { CashflowTab } from "./financials/cashflow-tab";
import { GrowthTab } from "./financials/growth-tab";
import type { Fundamentals } from "@/lib/market-data/types";

interface Props {
  symbol: string;
}

export function FinancialsGrid({ symbol }: Props) {
  const fundamentals = useFundamentals(symbol);
  const financials = useFinancials(symbol);

  const loading = fundamentals.isLoading || financials.isLoading;
  const error = fundamentals.isError && financials.isError;

  if (loading && !fundamentals.data && !financials.data) {
    return (
      <section aria-label="Financial breakdown" className="glass flex h-64 items-center justify-center rounded-2xl">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
      </section>
    );
  }

  if (error) {
    return (
      <section
        aria-label="Financial breakdown"
        className="glass flex h-48 flex-col items-center justify-center gap-2 rounded-2xl text-center text-muted-foreground"
      >
        <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
        <p className="text-sm">Couldn&rsquo;t load financial statements</p>
      </section>
    );
  }

  return (
    <section aria-label="Financial breakdown" className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-tight text-foreground">
            Financial breakdown
          </h2>
          <p className="text-xs text-muted-foreground">
            Valuation, profitability, growth, and capital structure · Yahoo Finance
          </p>
        </div>
      </div>

      <SectionTabs
        layoutId={`fin-tabs-${symbol}`}
        items={[
          {
            value: "valuation",
            label: "Valuation",
            content: <ValuationTab fundamentals={fundamentals.data ?? null} />,
          },
          {
            value: "income",
            label: "Financials",
            content: <IncomeTab financials={financials.data ?? null} />,
          },
          {
            value: "balance",
            label: "Balance Sheet",
            content: (
              <BalanceTab
                financials={financials.data ?? null}
                fundamentals={fundamentals.data ?? null}
              />
            ),
          },
          {
            value: "cashflow",
            label: "Cash Flow",
            content: <CashflowTab financials={financials.data ?? null} />,
          },
          {
            value: "growth",
            label: "Growth",
            content: <GrowthTab financials={financials.data ?? null} fundamentals={fundamentals.data ?? null} />,
          },
        ]}
      />
    </section>
  );
}

export type { Financials, Fundamentals };
