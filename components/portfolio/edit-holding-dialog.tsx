"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import type { PortfolioHolding } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { ModalShell } from "./modal-shell";

interface Props {
  /** When non-null, the dialog opens for this holding. */
  holding: PortfolioHolding | null;
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULT_CURRENCIES = ["USD", "INR", "LKR", "GBP", "EUR", "CAD", "AUD", "JPY"];

export function EditHoldingDialog({ holding, onClose, onSaved }: Props) {
  const [shares, setShares] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed form whenever the target changes
  useEffect(() => {
    if (!holding) return;
    setShares(String(holding.shares));
    setCostBasis(String(holding.costBasis));
    setCurrency(holding.currency);
    setPurchaseDate(holding.purchaseDate.slice(0, 10));
    setNotes(holding.notes ?? "");
    setError(null);
    setSubmitting(false);
  }, [holding]);

  const sharesNum = Number(shares);
  const costNum = Number(costBasis);
  const validShares = Number.isFinite(sharesNum) && sharesNum > 0;
  const validCost = Number.isFinite(costNum) && costNum >= 0;
  const canSubmit = Boolean(holding && validShares && validCost && currency && purchaseDate);

  // Detect dirty so we don't fire a no-op PATCH
  const dirty = useMemo(() => {
    if (!holding) return false;
    return (
      Number(shares) !== holding.shares ||
      Number(costBasis) !== holding.costBasis ||
      currency !== holding.currency ||
      purchaseDate !== holding.purchaseDate.slice(0, 10) ||
      (notes.trim() || null) !== (holding.notes ?? null)
    );
  }, [holding, shares, costBasis, currency, purchaseDate, notes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!holding || !canSubmit) return;
    if (!dirty) {
      onClose();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio/${holding.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shares: sharesNum,
          costBasis: costNum,
          currency: currency.toUpperCase(),
          purchaseDate,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `Request failed (${res.status})`);
        return;
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      open={Boolean(holding)}
      onClose={onClose}
      title={holding ? `Edit ${holding.symbol}` : "Edit holding"}
      description={
        holding
          ? `Lot purchased ${holding.purchaseDate.slice(0, 10)}. Symbol cannot be changed - delete and re-add to move it.`
          : undefined
      }
      size="md"
    >
      {holding && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Symbol pill (read-only) */}
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-mono text-sm font-semibold text-foreground">{holding.symbol}</span>
            {holding.exchange && <span className="badge-ticker">{holding.exchange}</span>}
            {holding.name && <span className="truncate">{holding.name}</span>}
          </div>

          {/* Shares + cost basis */}
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Shares"
              value={shares}
              onChange={setShares}
              invalid={shares.length > 0 && !validShares}
              inputMode="decimal"
            />
            <Field
              label={`Cost / share (${currency})`}
              value={costBasis}
              onChange={setCostBasis}
              invalid={costBasis.length > 0 && !validCost}
              inputMode="decimal"
            />
          </div>

          {/* Currency + purchase date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="cursor-pointer rounded-lg border border-border/70 bg-card/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                {DEFAULT_CURRENCIES.includes(currency) ? null : (
                  <option value={currency}>{currency}</option>
                )}
                {DEFAULT_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Purchase date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                max={today()}
                className="cursor-pointer rounded-lg border border-border/70 bg-card/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={280}
              className="resize-none rounded-lg border border-border/70 bg-card/60 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <footer className="-mx-5 -mb-4 flex items-center justify-end gap-2 border-t border-border/60 bg-card/60 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border/70 bg-card/60 px-3 text-xs font-medium text-foreground transition-colors hover:bg-card"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting || !dirty}
              className={cn(
                "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-transform",
                "disabled:cursor-not-allowed disabled:opacity-50",
                !submitting && canSubmit && dirty && "hover:-translate-y-px",
              )}
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              Save changes
            </button>
          </footer>
        </form>
      )}
    </ModalShell>
  );
}

function Field({
  label,
  value,
  onChange,
  invalid,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </label>
      <input
        type="text"
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "rounded-lg border bg-card/60 px-3 py-2 font-mono text-sm tabular-nums text-foreground outline-none transition-colors focus:border-primary",
          invalid ? "border-destructive/70" : "border-border/70",
        )}
      />
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
