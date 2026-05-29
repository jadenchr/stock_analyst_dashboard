"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BellOff,
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useAlerts, type PriceAlertRow } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";

/* ============================================================
 * AlertsClient
 * ============================================================
 * Create + manage above/below price alerts. Each row has
 * Reset (re-arm a fired alert), Toggle (active on/off), Delete.
 * "Add alert" lives at the top in a slide-down composer.
 */

export function AlertsClient() {
  const { data, isLoading, isError } = useAlerts();
  const [composerOpen, setComposerOpen] = useState(false);
  const alerts = data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pt-2">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <Bell className="h-4 w-4 text-primary" aria-hidden />
            </span>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Price alerts
            </h1>
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Get pinged the moment a ticker crosses your threshold. Email and the in-app bell.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setComposerOpen((v) => !v)}
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {composerOpen ? "Close" : "New alert"}
        </button>
      </header>

      <AnimatePresence initial={false}>
        {composerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <AlertComposer onSaved={() => setComposerOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {isError && (
        <div className="glass rounded-xl px-4 py-3 text-sm text-muted-foreground">
          Couldn&rsquo;t load alerts right now.
        </div>
      )}

      {!isLoading && alerts.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
          <Bell className="h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="font-display text-base text-foreground">No alerts yet</p>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Tap <span className="font-semibold text-foreground">New alert</span> above, or use the
            bell icon on any stock detail page to set one up in seconds.
          </p>
        </div>
      ) : (
        <ul className="glass flex flex-col divide-y divide-border/30 overflow-hidden rounded-2xl">
          {alerts.map((a) => (
            <AlertRow key={a.id} alert={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------- composer ----------------- */

function AlertComposer({ onSaved }: { onSaved: () => void }) {
  const qc = useQueryClient();
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [target, setTarget] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const s = symbol.trim().toUpperCase();
    const t = Number(target);
    if (!s || !Number.isFinite(t) || t <= 0) {
      setError("Enter a ticker and a positive target price.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: s,
          direction,
          targetPrice: t,
          currency,
          note: note.trim() || undefined,
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(body?.error ?? `Save failed (${res.status})`);
        return;
      }
      // Reset + close.
      setSymbol("");
      setTarget("");
      setNote("");
      await qc.invalidateQueries({ queryKey: ["alerts"] });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.1fr_0.9fr_0.7fr]">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Ticker
          </span>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="AAPL, NVDA, RELIANCE.NS…"
            maxLength={24}
            autoCapitalize="characters"
            className="h-11 rounded-lg border border-border/70 bg-card/60 px-3 font-mono text-sm uppercase text-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Direction
          </span>
          <div role="radiogroup" className="flex h-11 items-center gap-1 rounded-lg border border-border/70 bg-card/60 p-1">
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
                    "flex h-full flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md text-sm font-medium capitalize transition-colors",
                    active
                      ? d === "above"
                        ? "bg-bull/15 text-bull"
                        : "bg-bear/15 text-bear"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Target
          </span>
          <div className="flex h-11 items-center gap-1.5 rounded-lg border border-border/70 bg-card/60 pl-3 pr-1.5">
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0.00"
              className="h-full flex-1 bg-transparent font-mono tabular-nums text-foreground focus:outline-none"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-8 cursor-pointer rounded-md border border-border/70 bg-background/60 px-2 text-xs font-medium text-foreground"
              aria-label="Currency"
            >
              {["USD", "INR", "LKR", "GBP", "EUR", "CAD", "AUD", "JPY"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Note (optional)
        </span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={140}
          placeholder="Reminder of the thesis, why this level matters…"
          className="h-11 rounded-lg border border-border/70 bg-card/60 px-3 text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </label>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated disabled:cursor-wait disabled:opacity-70"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
          Save alert
        </button>
      </div>
    </div>
  );
}

/* ----------------- row ----------------- */

function AlertRow({ alert }: { alert: PriceAlertRow }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<"toggle" | "reset" | "delete" | null>(null);
  const triggered = Boolean(alert.triggered_at);

  async function patch(body: Record<string, unknown>, label: "toggle" | "reset") {
    setBusy(label);
    try {
      const res = await fetch(`/api/alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) await qc.invalidateQueries({ queryKey: ["alerts"] });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${alert.direction} ${formatCurrency(Number(alert.target_price), alert.currency)} alert on ${alert.symbol}?`)) {
      return;
    }
    setBusy("delete");
    try {
      const res = await fetch(`/api/alerts/${alert.id}`, { method: "DELETE" });
      if (res.ok) await qc.invalidateQueries({ queryKey: ["alerts"] });
    } finally {
      setBusy(null);
    }
  }

  const Arrow = alert.direction === "above" ? ArrowUpRight : ArrowDownRight;
  const arrowColor = alert.direction === "above" ? "text-bull" : "text-bear";

  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/20 sm:px-5">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1",
          alert.direction === "above"
            ? "bg-bull/10 ring-bull/30"
            : "bg-bear/10 ring-bear/30",
        )}
      >
        <Arrow className={cn("h-4 w-4", arrowColor)} aria-hidden />
      </div>

      <Link
        href={`/stock/${encodeURIComponent(alert.symbol)}`}
        className="min-w-0 flex-1"
        title={alert.note ?? undefined}
      >
        <p className="flex items-center gap-2 font-mono text-sm font-semibold text-foreground">
          {alert.symbol}
          {triggered && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-sans text-[9px] font-semibold uppercase tracking-wider text-primary">
              Triggered
            </span>
          )}
          {!alert.active && !triggered && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card/60 px-1.5 py-0.5 font-sans text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Paused
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {alert.direction === "above" ? "Notify when ≥ " : "Notify when ≤ "}
          <span className="font-mono text-foreground/80">
            {formatCurrency(Number(alert.target_price), alert.currency)}
          </span>
          {alert.note && <span className="ml-2 text-muted-foreground/70">· {alert.note}</span>}
        </p>
      </Link>

      <div className="flex items-center gap-1">
        {triggered && (
          <button
            type="button"
            onClick={() => patch({ reset: true }, "reset")}
            disabled={busy != null}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-border/70 hover:bg-card hover:text-foreground"
            aria-label="Re-arm alert"
            title="Re-arm"
          >
            {busy === "reset" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden />}
          </button>
        )}
        <button
          type="button"
          onClick={() => patch({ active: !alert.active }, "toggle")}
          disabled={busy != null || triggered}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-border/70 hover:bg-card hover:text-foreground disabled:opacity-40"
          aria-label={alert.active ? "Pause" : "Resume"}
          title={alert.active ? "Pause" : "Resume"}
        >
          {busy === "toggle" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : alert.active ? (
            <BellOff className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Bell className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy != null}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          aria-label="Delete"
          title="Delete"
        >
          {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />}
        </button>
      </div>
    </li>
  );
}
