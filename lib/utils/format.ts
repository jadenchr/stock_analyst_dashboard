/**
 * Lightweight, locale-agnostic formatters for financial UI.
 * All functions are deterministic and pure; safe for server + client use.
 */

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
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

/**
 * Per-currency formatters memoized in a Map. The set of currencies in
 * play is tiny (USD / INR / LKR / GBP / EUR), so a cache prevents
 * recreating Intl.NumberFormat on every render.
 */
const currencyFormatters = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  const key = currency.toUpperCase();
  let fmt = currencyFormatters.get(key);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: key,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      // Unknown currency code — fall back to USD format
      fmt = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    currencyFormatters.set(key, fmt);
  }
  return fmt;
}

/**
 * Format a value in the supplied currency. Defaults to USD when not specified
 * so existing US-centric call sites keep working unchanged.
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: string = "USD",
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return getCurrencyFormatter(currency).format(value);
}

/**
 * Compact currency: "$1.2B" / "₹4.4T" / "Rs 96.5K". Pairs the currency
 * symbol (or 3-letter code if no symbol available) with our compact format.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CAD: "$",
  AUD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
  LKR: "Rs ",
};

export function formatCompactMoney(
  value: number | null | undefined,
  currency: string = "USD",
): string {
  if (value == null || Number.isNaN(value)) return "—";
  const code = currency.toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code] ?? `${code} `;
  return `${symbol}${compactFormatter.format(value)}`;
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
