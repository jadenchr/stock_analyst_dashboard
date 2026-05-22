"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Plus, Upload, Wallet } from "lucide-react";
import { usePortfolio, type PortfolioHolding } from "@/lib/api/client";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { PortfolioSummary } from "./portfolio-summary";
import { HoldingsTable } from "./holdings-table";
import { AddHoldingDialog } from "./add-holding-dialog";
import { EditHoldingDialog } from "./edit-holding-dialog";
import { CsvImportDialog } from "./csv-import-dialog";

export function PortfolioClient() {
  const { data, isLoading, isFetching, isError, refetch } = usePortfolio();
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PortfolioHolding | null>(null);

  if (isLoading && !data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <SkeletonBlock className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="glass flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center">
        <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
        <p className="text-sm text-foreground">Couldn&rsquo;t load your portfolio.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="cursor-pointer rounded-lg border border-border/70 bg-card/60 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-card"
        >
          Try again
        </button>
      </div>
    );
  }

  const hasHoldings = data.holdings.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Action bar */}
      <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-3">
        <span className="inline-flex items-center gap-1.5 pl-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Wallet className="h-3 w-3" aria-hidden />
          {data.holdings.length} {data.holdings.length === 1 ? "holding" : "holdings"}
        </span>

        {data.stale.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral/30 bg-neutral/10 px-2 py-0.5 text-[10px] font-medium text-neutral">
            Couldn&rsquo;t price: {data.stale.slice(0, 4).join(", ")}
            {data.stale.length > 4 ? `, +${data.stale.length - 4} more` : ""}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isFetching && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              refreshing
            </span>
          )}
          <button
            type="button"
            onClick={() => setCsvOpen(true)}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border/70 bg-card/60 px-3 text-xs font-medium text-foreground transition-colors hover:border-border hover:bg-card"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Import CSV
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-px"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add holding
          </button>
        </div>
      </div>

      {/* Per-currency totals */}
      {hasHoldings && <PortfolioSummary totals={data.totals} />}

      {/* Empty state */}
      {!hasHoldings ? (
        <EmptyState onAdd={() => setAddOpen(true)} onImport={() => setCsvOpen(true)} />
      ) : (
        <HoldingsTable holdings={data.holdings} onEdit={(h) => setEditTarget(h)} onChanged={refetch} />
      )}

      {/* Modals */}
      <AddHoldingDialog open={addOpen} onClose={() => setAddOpen(false)} onSaved={refetch} />
      <CsvImportDialog open={csvOpen} onClose={() => setCsvOpen(false)} onImported={refetch} />
      <EditHoldingDialog
        holding={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={refetch}
      />
    </div>
  );
}

function EmptyState({ onAdd, onImport }: { onAdd: () => void; onImport: () => void }) {
  return (
    <div className="glass flex flex-col items-center gap-4 rounded-2xl px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
        <Wallet className="h-5 w-5 text-primary" aria-hidden />
      </div>
      <div>
        <h3 className="font-display text-xl font-semibold tracking-tight">
          Start tracking your portfolio
        </h3>
        <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
          Add a lot manually or drop in a broker CSV. We&rsquo;ll calculate cost-basis P&amp;L and
          refresh quotes every minute.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-px"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add your first holding
        </button>
        <button
          type="button"
          onClick={onImport}
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-border/70 bg-card/60 px-4 text-sm font-medium text-foreground transition-colors hover:bg-card"
        >
          <Upload className="h-4 w-4" aria-hidden />
          Import CSV
        </button>
      </div>
    </div>
  );
}
