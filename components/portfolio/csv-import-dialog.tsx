"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileDown, Loader2, Upload, XCircle } from "lucide-react";
import type { PortfolioImportPreviewRow, PortfolioImportResult } from "@/lib/portfolio/types";
import { cn } from "@/lib/utils";
import { ModalShell } from "./modal-shell";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

const DEFAULT_CURRENCIES = ["USD", "INR", "LKR", "GBP", "EUR", "CAD", "AUD", "JPY"];
const MAX_BYTES = 256 * 1024;

const SAMPLE_CSV =
  "symbol,shares,cost basis,purchase date,notes\n" +
  "AAPL,10,150.25,2024-01-15,long-term hold\n" +
  "MSFT,5,310.10,2024-03-02,\n" +
  "RELIANCE.NS,12,2450.00,2024-06-10,Indian rupees lot\n";

type Stage = "select" | "preview" | "importing" | "done";

interface PreviewState {
  rows: PortfolioImportPreviewRow[];
}

export function CsvImportDialog({ open, onClose, onImported }: Props) {
  const [stage, setStage] = useState<Stage>("select");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [result, setResult] = useState<PortfolioImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStage("select");
      setCsvText("");
      setFileName(null);
      setPreview(null);
      setResult(null);
      setError(null);
      setSubmitting(false);
      setDragOver(false);
      setCurrency("USD");
    }
  }, [open]);

  const validCount = useMemo(
    () => preview?.rows.filter((r) => r.valid).length ?? 0,
    [preview],
  );
  const invalidCount = useMemo(
    () => preview?.rows.filter((r) => !r.valid).length ?? 0,
    [preview],
  );

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError(`File too large (max ${(MAX_BYTES / 1024).toFixed(0)} KB)`);
      return;
    }
    if (!/\.(csv|txt)$/i.test(file.name) && file.type !== "text/csv") {
      setError("Please choose a .csv file");
      return;
    }
    setFileName(file.name);
    try {
      const text = await file.text();
      setCsvText(text);
      await runPreview(text);
    } catch {
      setError("Couldn't read the file.");
    }
  }

  async function runPreview(text: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/portfolio/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview: true, csv: text, defaultCurrency: currency }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? `Preview failed (${res.status})`);
        return;
      }
      setPreview({ rows: (body?.rows ?? []) as PortfolioImportPreviewRow[] });
      setStage("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCommit() {
    if (!csvText) return;
    setSubmitting(true);
    setError(null);
    setStage("importing");
    try {
      const res = await fetch("/api/portfolio/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview: false, csv: csvText, defaultCurrency: currency }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? `Import failed (${res.status})`);
        setStage("preview");
        return;
      }
      setResult({
        inserted: body?.inserted ?? 0,
        skipped: body?.skipped ?? 0,
        errors: body?.errors ?? [],
      });
      setStage("done");
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setStage("preview");
    } finally {
      setSubmitting(false);
    }
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stockvision-portfolio-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Import portfolio from CSV"
      description={
        stage === "select"
          ? "Drop in a broker export. We'll detect symbol, shares, cost basis, and purchase date."
          : stage === "preview"
            ? `Review ${preview?.rows.length ?? 0} parsed rows before committing.`
            : stage === "importing"
              ? "Importing…"
              : "Import complete."
      }
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {stage === "select" && (
          <>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFile(file);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                dragOver
                  ? "border-primary/60 bg-primary/5"
                  : "border-border/60 bg-card/40 hover:border-border hover:bg-card/60",
              )}
            >
              <Upload className="h-6 w-6 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium text-foreground">
                {submitting ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Parsing…
                  </span>
                ) : (
                  "Click to choose or drop a CSV file here"
                )}
              </p>
              <p className="text-xs text-muted-foreground">Up to 1,000 rows / 256 KB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-xs">
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">Need a template?</span>
                <span className="text-muted-foreground">
                  Required columns: symbol, shares, cost basis. Optional: purchase date, notes.
                </span>
              </div>
              <button
                type="button"
                onClick={downloadSample}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border/70 bg-card/60 px-3 text-xs font-medium text-foreground transition-colors hover:bg-card"
              >
                <FileDown className="h-3.5 w-3.5" aria-hidden />
                Download sample
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Default currency
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
              <p className="text-[11px] text-muted-foreground">
                Applied to every row - your CSV doesn&rsquo;t need a currency column.
              </p>
            </div>
          </>
        )}

        {stage === "preview" && preview && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-bull/40 bg-bull/10 px-2 py-0.5 text-bull">
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                {validCount} valid
              </span>
              {invalidCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-bear/40 bg-bear/10 px-2 py-0.5 text-bear">
                  <XCircle className="h-3 w-3" aria-hidden />
                  {invalidCount} skipped
                </span>
              )}
              {fileName && (
                <span className="ml-auto truncate text-muted-foreground">{fileName}</span>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-border/60">
              <div className="max-h-[320px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card/95 backdrop-blur">
                    <tr className="border-b border-border/60 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      <th className="px-3 py-2 text-left font-semibold">#</th>
                      <th className="px-3 py-2 text-left font-semibold">Symbol</th>
                      <th className="px-3 py-2 text-right font-semibold">Shares</th>
                      <th className="px-3 py-2 text-right font-semibold">Cost / sh</th>
                      <th className="px-3 py-2 text-left font-semibold">Date</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r) => (
                      <tr
                        key={r.rowIndex}
                        className={cn(
                          "border-b border-border/30 last:border-b-0",
                          !r.valid && "bg-bear/5",
                        )}
                      >
                        <td className="px-3 py-1.5 font-mono text-muted-foreground">{r.rowIndex}</td>
                        <td className="px-3 py-1.5 font-mono font-medium text-foreground">
                          {r.symbol ?? "-"}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono tabular-nums text-foreground">
                          {r.shares ?? "-"}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono tabular-nums text-foreground">
                          {r.costBasis ?? "-"}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-muted-foreground">
                          {r.purchaseDate ?? "-"}
                        </td>
                        <td className="px-3 py-1.5">
                          {r.valid ? (
                            <span className="inline-flex items-center gap-1 text-bull">
                              <CheckCircle2 className="h-3 w-3" aria-hidden />
                              ok
                            </span>
                          ) : (
                            <span
                              title={r.errors.join("; ")}
                              className="inline-flex items-center gap-1 text-bear"
                            >
                              <XCircle className="h-3 w-3" aria-hidden />
                              {r.errors[0] ?? "invalid"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {stage === "importing" && (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
            <span>Inserting {validCount} {validCount === 1 ? "lot" : "lots"}…</span>
          </div>
        )}

        {stage === "done" && result && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bull/15 ring-1 ring-bull/30">
              <CheckCircle2 className="h-6 w-6 text-bull" aria-hidden />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold tracking-tight">
                {result.inserted} {result.inserted === 1 ? "lot" : "lots"} imported
              </h3>
              {result.skipped > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.skipped} row{result.skipped === 1 ? " was" : "s were"} skipped - see the
                  preview for reasons.
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <footer className="-mx-5 -mb-4 flex items-center justify-between gap-2 border-t border-border/60 bg-card/60 px-5 py-3">
          {stage === "preview" ? (
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setCsvText("");
                setFileName(null);
                setStage("select");
              }}
              className="inline-flex h-9 cursor-pointer items-center rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Choose a different file
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border/70 bg-card/60 px-3 text-xs font-medium text-foreground transition-colors hover:bg-card"
            >
              {stage === "done" ? "Close" : "Cancel"}
            </button>
            {stage === "preview" && (
              <button
                type="button"
                onClick={handleCommit}
                disabled={submitting || validCount === 0}
                className={cn(
                  "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-transform",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  !submitting && validCount > 0 && "hover:-translate-y-px",
                )}
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                Import {validCount} {validCount === 1 ? "lot" : "lots"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </ModalShell>
  );
}
