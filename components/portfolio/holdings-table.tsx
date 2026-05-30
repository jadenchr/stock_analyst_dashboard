"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Loader2, Pencil, Trash2 } from "lucide-react";
import type { PortfolioHolding } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

interface Props {
  holdings: PortfolioHolding[];
  onEdit: (h: PortfolioHolding) => void;
  onChanged: () => void;
}

type SortKey = "symbol" | "value" | "pl" | "plPct" | "day";
type SortDir = "asc" | "desc";

export function HoldingsTable({ holdings, onEdit, onChanged }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  }

  const sorted = [...holdings].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    const av = pickSort(a, sortKey);
    const bv = pickSort(b, sortKey);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string") return av.localeCompare(bv as string) * dir;
    return ((av as number) - (bv as number)) * dir;
  });

  async function handleDelete(h: PortfolioHolding) {
    if (!confirm(`Delete ${h.shares} ${h.symbol} (${formatCurrency(h.totalCostBasis, h.currency)} cost basis)?`)) {
      return;
    }
    setDeletingId(h.id);
    try {
      const res = await fetch(`/api/portfolio/${h.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(`Delete failed: ${body?.error ?? res.status}`);
        return;
      }
      onChanged();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="glass overflow-hidden rounded-2xl">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-card/40 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <Th sortKey="symbol" current={sortKey} dir={sortDir} onClick={() => toggleSort("symbol")} align="left">
                Symbol
              </Th>
              <th className="px-4 py-2.5 text-left font-semibold">Name</th>
              <th className="px-4 py-2.5 text-right font-semibold">Shares</th>
              <th className="px-4 py-2.5 text-right font-semibold">Cost / sh</th>
              <th className="px-4 py-2.5 text-right font-semibold">Price</th>
              <Th sortKey="value" current={sortKey} dir={sortDir} onClick={() => toggleSort("value")} align="right">
                Value
              </Th>
              <Th sortKey="pl" current={sortKey} dir={sortDir} onClick={() => toggleSort("pl")} align="right">
                P&amp;L
              </Th>
              <Th sortKey="plPct" current={sortKey} dir={sortDir} onClick={() => toggleSort("plPct")} align="right">
                P&amp;L %
              </Th>
              <Th sortKey="day" current={sortKey} dir={sortDir} onClick={() => toggleSort("day")} align="right">
                Today
              </Th>
              <th className="w-20 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((h) => {
              const positive = (h.unrealizedPL ?? 0) >= 0;
              const Arrow = positive ? ArrowUpRight : ArrowDownRight;
              const dayPositive = (h.dayChange ?? 0) >= 0;
              return (
                <tr
                  key={h.id}
                  className="border-b border-border/30 transition-colors duration-150 last:border-b-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/stock/${h.symbol}`}
                      className="inline-flex cursor-pointer items-center gap-2 text-foreground transition-colors hover:text-primary"
                    >
                      <span className="font-mono font-semibold">{h.symbol}</span>
                      {h.exchange && (
                        <span className="badge-ticker">{h.exchange.slice(0, 8)}</span>
                      )}
                    </Link>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">
                    {h.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                    {h.shares}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                    {formatCurrency(h.costBasis, h.currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                    {h.currentPrice != null ? formatCurrency(h.currentPrice, h.currency) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                    {h.marketValue != null ? formatCurrency(h.marketValue, h.currency) : "-"}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-mono tabular-nums",
                      h.unrealizedPL == null
                        ? "text-muted-foreground"
                        : positive
                          ? "text-bull"
                          : "text-bear",
                    )}
                  >
                    {h.unrealizedPL == null ? (
                      "-"
                    ) : (
                      <span className="inline-flex items-center justify-end gap-1">
                        <Arrow className="h-3 w-3" aria-hidden />
                        {positive ? "+" : ""}
                        {formatCurrency(h.unrealizedPL, h.currency)}
                      </span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-mono tabular-nums",
                      h.unrealizedPLPct == null
                        ? "text-muted-foreground"
                        : positive
                          ? "text-bull"
                          : "text-bear",
                    )}
                  >
                    {h.unrealizedPLPct == null ? "-" : formatPercent(h.unrealizedPLPct)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-mono tabular-nums",
                      h.dayChange == null
                        ? "text-muted-foreground"
                        : dayPositive
                          ? "text-bull"
                          : "text-bear",
                    )}
                  >
                    {h.dayChange == null ? "-" : formatPercent(h.dayChangePct ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(h)}
                        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-border/70 hover:bg-card hover:text-foreground"
                        aria-label={`Edit ${h.symbol}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(h)}
                        disabled={deletingId === h.id}
                        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        aria-label={`Delete ${h.symbol}`}
                      >
                        {deletingId === h.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card stack */}
      <ul className="flex flex-col divide-y divide-border/30 md:hidden">
        {sorted.map((h) => {
          const positive = (h.unrealizedPL ?? 0) >= 0;
          const Arrow = positive ? ArrowUpRight : ArrowDownRight;
          return (
            <li key={h.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/stock/${h.symbol}`}
                  className="flex min-w-0 items-center gap-2 text-foreground"
                >
                  <span className="font-mono text-base font-semibold">{h.symbol}</span>
                  {h.exchange && (
                    <span className="badge-ticker">{h.exchange.slice(0, 8)}</span>
                  )}
                </Link>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(h)}
                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border/70 hover:bg-card hover:text-foreground"
                    aria-label={`Edit ${h.symbol}`}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(h)}
                    disabled={deletingId === h.id}
                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    aria-label={`Delete ${h.symbol}`}
                  >
                    {deletingId === h.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </button>
                </div>
              </div>

              {h.name && (
                <p className="truncate text-[11px] text-muted-foreground">{h.name}</p>
              )}

              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border/30 pt-2">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Shares
                  </dt>
                  <dd className="font-mono text-xs tabular-nums">{h.shares}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Cost / sh
                  </dt>
                  <dd className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatCurrency(h.costBasis, h.currency)}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Price
                  </dt>
                  <dd className="font-mono text-xs tabular-nums">
                    {h.currentPrice != null ? formatCurrency(h.currentPrice, h.currency) : "-"}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Value
                  </dt>
                  <dd className="font-mono text-xs tabular-nums">
                    {h.marketValue != null ? formatCurrency(h.marketValue, h.currency) : "-"}
                  </dd>
                </div>
                <div className="col-span-2 flex items-center justify-between border-t border-border/30 pt-2">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    P&amp;L
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-mono text-sm tabular-nums",
                      h.unrealizedPL == null
                        ? "text-muted-foreground"
                        : positive
                          ? "text-bull"
                          : "text-bear",
                    )}
                  >
                    {h.unrealizedPL != null && <Arrow className="h-3 w-3" aria-hidden />}
                    {h.unrealizedPL != null
                      ? `${positive ? "+" : ""}${formatCurrency(h.unrealizedPL, h.currency)}`
                      : "-"}
                    {h.unrealizedPLPct != null && (
                      <span className="text-[11px] text-muted-foreground">
                        ({formatPercent(h.unrealizedPLPct)})
                      </span>
                    )}
                  </span>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function pickSort(h: PortfolioHolding, key: SortKey): number | string | null {
  switch (key) {
    case "symbol":
      return h.symbol;
    case "value":
      return h.marketValue ?? 0;
    case "pl":
      return h.unrealizedPL ?? 0;
    case "plPct":
      return h.unrealizedPLPct ?? 0;
    case "day":
      return h.dayChangePct ?? 0;
  }
}

function Th({
  sortKey,
  current,
  dir,
  onClick,
  align,
  children,
}: {
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: () => void;
  align: "left" | "right";
  children: React.ReactNode;
}) {
  const active = current === sortKey;
  return (
    <th
      className={cn(
        "px-4 py-2.5 font-semibold",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 transition-colors",
          active ? "text-foreground" : "hover:text-foreground",
        )}
      >
        {children}
        {active && <span aria-hidden>{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
