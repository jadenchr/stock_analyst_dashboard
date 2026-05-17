import { apiHandler, optionalQuery } from "@/lib/api/handler";
import { resolveTicker } from "@/lib/api/ticker-param";
import * as md from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ ticker: string }> };

function parsePeriod(input: string, fallback: number): number {
  const n = Number(input);
  if (!Number.isFinite(n) || n < 2 || n > 400) return fallback;
  return Math.floor(n);
}

/**
 * Returns RSI, MACD, and configurable SMA/EMA series in a single call.
 * Alpha Vantage's free tier is rate-limited to ~5 req/min so we batch
 * here and cache aggressively (per-ticker, per-period).
 */
export async function GET(request: Request, { params }: Ctx) {
  const ticker = await resolveTicker(params);
  return apiHandler({ bucket: "technicals", limit: 10 }, async ({ url }) => {
    const smaPeriod = parsePeriod(optionalQuery(url, "sma", "50"), 50);
    const emaPeriod = parsePeriod(optionalQuery(url, "ema", "20"), 20);

    const [rsi, macd, sma, ema] = await Promise.allSettled([
      md.technicals.rsi(ticker),
      md.technicals.macd(ticker),
      md.technicals.sma(ticker, smaPeriod),
      md.technicals.ema(ticker, emaPeriod),
    ]);

    return {
      rsi: rsi.status === "fulfilled" ? rsi.value : [],
      macd: macd.status === "fulfilled" ? macd.value : [],
      sma: sma.status === "fulfilled" ? { period: smaPeriod, values: sma.value } : null,
      ema: ema.status === "fulfilled" ? { period: emaPeriod, values: ema.value } : null,
    };
  })(request);
}
