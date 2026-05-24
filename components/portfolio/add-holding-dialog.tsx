"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Search } from "lucide-react";
import { useSearchQuery } from "@/lib/api/client";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { SearchResult } from "@/lib/market-data/types";
import { cn } from "@/lib/utils";
import { ModalShell } from "./modal-shell";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULT_CURRENCIES = ["USD", "INR", "LKR", "GBP", "EUR", "CAD", "AUD", "JPY"];

export function AddHoldingDialog({ open, onClose, onSaved }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [shares, setShares] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected(null);
      setShares("");
      setCostBasis("");
      setCurrency("USD");
      setPurchaseDate(today());
      setNotes("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const debounced = useDebouncedValue(query, 200);
  const showSearch = !selected && debounced.trim().length >= 1;
  const search = useSearchQuery(showSearch ? debounced : "");

  const sharesNum = Number(shares);
  const costNum = Number(costBasis);
  const validShares = Number.isFinite(sharesNum) && sharesNum > 0;
  const validCost = Number.isFinite(costNum) && costNum >= 0;
  const canSubmit = Boolean(selected && validShares && validCost && currency && purchaseDate);

  const totalCost = useMemo(() => {
    if (!validShares || !validCost) return null;
    return sharesNum * costNum;
  }, [sharesNum, costNum, validShares, validCost]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selected.symbol,
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
      open={open}
      onClose={onClose}
      title="Add holding"
      description="Record a new lot. Each row is one purchase - adjust shares or cost basis later."
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Ticker picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Ticker
          </label>
          {selected ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-3 py-2">
              <span className="font-mono text-sm font-semibold">{selected.symbol}</span>
              <span className="badge-ticker text-[10px]">{selected.exchange}</span>
              <span className="truncate text-xs text-muted-foreground">{selected.name}</span>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setQuery("");
                }}
                className="ml-auto cursor-pointer text-[11px] font-medium text-primary hover:underline"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="text"
                inputMode="search"
                autoFocus
                placeholder="Search symbol or company (e.g. AAPL, RELIANCE.NS, JKH.N0000)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-border/70 bg-card/60 py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
              />
              {showSearch && (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 max-h-64 overflow-y-auto rounded-lg border border-border/70 bg-card/95 shadow-xl backdrop-blur">
                  {search.isLoading && (
                    <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                      Searching…
                    </div>
                  )}
                  {!search.isLoading && search.data && search.data.length === 0 && (
                    <div className="px-3 py-2.5 text-xs text-muted-foreground">
                      No matches.
                    </div>
                  )}
                  {search.data?.slice(0, 10).map((row) => (
                    <button
                      type="button"
                      key={`${row.symbol}-${row.exchange}`}
                      onClick={() => {
                        setSelected(row);
                        setQuery("");
                        setCurrency(guessCurrency(row));
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 border-b border-border/40 px-3 py-2 text-left text-xs transition-colors last:border-b-0 hover:bg-muted/50"
                    >
                      <span className="font-mono font-semibold text-foreground">{row.symbol}</span>
                      <span className="badge-ticker text-[9px]">{row.exchange}</span>
                      <span className="truncate text-muted-foreground">{row.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shares + cost basis */}
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Shares"
            value={shares}
            onChange={setShares}
            placeholder="100"
            invalid={shares.length > 0 && !validShares}
            inputMode="decimal"
          />
          <Field
            label={`Cost / share (${currency})`}
            value={costBasis}
            onChange={setCostBasis}
            placeholder="150.00"
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
            Notes <span className="font-normal normal-case tracking-normal text-muted-foreground/70">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. taxable account, conviction buy, etc."
            rows={2}
            className="resize-none rounded-lg border border-border/70 bg-card/60 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
            maxLength={280}
          />
        </div>

        {/* Total preview */}
        {totalCost != null && (
          <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Total cost basis</span>
            <span className="font-mono font-semibold text-foreground">
              {totalCost.toLocaleString("en-US", {
                style: "currency",
                currency: safeCurrency(currency),
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        )}

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
            disabled={!canSubmit || submitting}
            className={cn(
              "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-transform",
              "disabled:cursor-not-allowed disabled:opacity-50",
              !submitting && canSubmit && "hover:-translate-y-px",
            )}
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            Add holding
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  invalid,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
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
        placeholder={placeholder}
        className={cn(
          "rounded-lg border bg-card/60 px-3 py-2 font-mono text-sm tabular-nums text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary",
          invalid ? "border-destructive/70" : "border-border/70",
        )}
      />
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function safeCurrency(c: string) {
  try {
    new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(0);
    return c;
  } catch {
    return "USD";
  }
}

/**
 * Best-effort currency guess from a Yahoo-style search result's exchange.
 * We only know what suffix the symbol has - full FX detection lives server-side.
 */
function guessCurrency(row: SearchResult): string {
  const suffix = row.symbol.split(".").pop()?.toUpperCase();
  switch (suffix) {
    case "NS":
    case "BO":
      return "INR";
    case "L":
      return "GBP";
    case "TO":
    case "V":
      return "CAD";
    case "AX":
      return "AUD";
    case "T":
      return "JPY";
    case "DE":
    case "PA":
    case "MI":
    case "MC":
    case "AS":
      return "EUR";
    default:
      // Sri Lanka CSE symbols often look like JKH.N0000
      if (suffix && /^N\d/.test(suffix)) return "LKR";
      return "USD";
  }
}
