"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { useQuote } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/**
 * Small "Bell" button that lives next to the watchlist toggle on the
 * stock detail page. Opens a compact popover to set a price alert
 * pre-filled with the current price. Fires the same /api/alerts POST
 * as the full alerts page.
 */
export function CreateAlertButton({ symbol }: { symbol: string }) {
  const { data: quote } = useQuote(symbol);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [target, setTarget] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openPopover() {
    setError(null);
    setDone(false);
    // Pre-fill the target with the live price so the user can nudge it.
    if (quote?.price != null && !target) setTarget(quote.price.toFixed(2));
    setOpen(true);
  }

  async function save() {
    setError(null);
    const t = Number(target);
    if (!Number.isFinite(t) || t <= 0) {
      setError("Enter a positive target price.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          direction,
          targetPrice: t,
          currency: quote?.currency ?? "USD",
          note: note.trim() || undefined,
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(body?.error ?? `Save failed (${res.status})`);
        return;
      }
      setDone(true);
      await qc.invalidateQueries({ queryKey: ["alerts"] });
      // Auto-close after a beat so the success state lingers.
      setTimeout(() => setOpen(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openPopover}
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border/70 bg-card/60 px-3 text-xs font-medium text-foreground transition-colors hover:border-border hover:bg-card"
        aria-label={`Create price alert on ${symbol}`}
      >
        <Bell className="h-3.5 w-3.5 text-primary" aria-hidden />
        Alert
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop catches outside clicks. */}
            <div
              className="fixed inset-0 z-30"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.16 }}
              role="dialog"
              aria-label="Create price alert"
              className="absolute right-0 top-11 z-40 w-80 rounded-xl border border-border/70 bg-popover p-4 shadow-elevated"
            >
              <header className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5 text-primary" aria-hidden />
                  <span className="font-display text-sm font-semibold">
                    Alert on {symbol}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </header>

              {done ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <CheckCircle2 className="h-6 w-6 text-bull" aria-hidden />
                  <p className="text-xs font-semibold text-foreground">Alert armed</p>
                  <p className="text-[11px] text-muted-foreground">
                    We&rsquo;ll email you when the threshold crosses.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div role="radiogroup" className="flex items-center gap-1 rounded-lg border border-border/70 bg-card/60 p-1">
                    {(["above", "below"] as const).map((d) => {
                      const active = direction === d;
                      const Icon = d === "above" ? ArrowUpRight : ArrowDownRight;
                      return (
                        <button
                          key={d}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setDirection(d)}
                          className={cn(
                            "flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs font-medium capitalize transition-colors",
                            active
                              ? d === "above"
                                ? "bg-bull/15 text-bull"
                                : "bg-bear/15 text-bear"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Icon className="h-3 w-3" aria-hidden />
                          {d}
                        </button>
                      );
                    })}
                  </div>

                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Target ({quote?.currency ?? "USD"})
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      placeholder={quote?.price != null ? quote.price.toFixed(2) : "0.00"}
                      className="h-9 rounded-lg border border-border/70 bg-card/60 px-3 font-mono text-sm tabular-nums text-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    {quote?.price != null && (
                      <span className="text-[10px] text-muted-foreground/80">
                        Current: <span className="font-mono">{quote.price.toFixed(2)}</span>
                      </span>
                    )}
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Note (optional)
                    </span>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      maxLength={140}
                      placeholder="Why this level matters…"
                      className="h-9 rounded-lg border border-border/70 bg-card/60 px-3 text-xs text-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </label>

                  {error && <p className="text-[11px] text-destructive">{error}</p>}

                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-elevated disabled:cursor-wait disabled:opacity-70"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Bell className="h-3.5 w-3.5" aria-hidden />}
                    Arm alert
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
