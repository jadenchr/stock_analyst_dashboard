import { apiHandler } from "@/lib/api/handler";
import * as md from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Earnings calendar.
 *   ?days=14            - window from today (default 14, max 30)
 *   ?symbol=AAPL        - optional filter to a single ticker
 */
export const GET = apiHandler({ bucket: "earnings", limit: 30 }, async ({ url }) => {
  const days = clamp(Number(url.searchParams.get("days") ?? "14"), 1, 30);
  const symbol = (url.searchParams.get("symbol") ?? "").trim().toUpperCase() || undefined;
  const today = new Date();
  const future = new Date(today);
  future.setDate(today.getDate() + days);
  const fromISO = today.toISOString().slice(0, 10);
  const toISO = future.toISOString().slice(0, 10);
  const events = await md.earningsCalendar({ from: fromISO, to: toISO, symbol });
  return { from: fromISO, to: toISO, days, events };
});

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.trunc(n)));
}
