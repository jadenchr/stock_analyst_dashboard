/**
 * Lightweight, locale-agnostic formatters for financial UI.
 * All functions are deterministic and pure; safe for server + client use.
 */

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

const decimalFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return currencyFormatter.format(value);
}

export function formatCompact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return compactFormatter.format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return percentFormatter.format(value / 100);
}

export function formatDecimal(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return decimalFormatter.format(value);
}

export function formatDelta(value: number | null | undefined): {
  sign: "+" | "-" | "";
  display: string;
  tone: "bull" | "bear" | "neutral";
} {
  if (value == null || Number.isNaN(value)) {
    return { sign: "", display: "—", tone: "neutral" };
  }
  if (value > 0) return { sign: "+", display: decimalFormatter.format(value), tone: "bull" };
  if (value < 0)
    return { sign: "-", display: decimalFormatter.format(Math.abs(value)), tone: "bear" };
  return { sign: "", display: decimalFormatter.format(0), tone: "neutral" };
}

export function formatTimeAgo(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86_400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86_400)}d ago`;
}
