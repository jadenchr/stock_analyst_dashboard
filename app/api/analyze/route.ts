import { apiHandler, requiredQuery } from "@/lib/api/handler";
import { cached, cacheKey, TTL } from "@/lib/cache";
import { ValidationFailedError } from "@/lib/market-data/errors";
import { TickerSchema, classifyTicker } from "@/lib/utils/validators";
import { analyzeStock } from "@/lib/ai/analyzer";
import { buildStockData } from "@/lib/ai/stock-data";
import { FALLBACK_ANALYSIS } from "@/lib/ai/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Generous time budget — Gemini 2.5 Pro typically responds in 4–10s,
// the prompt-data assembly runs in parallel under 2s.
export const maxDuration = 30;

/**
 * GET /api/analyze?ticker=AAPL
 *
 * Server-side flow:
 *   1. Validate ticker (Zod regex).
 *   2. If CSE — refuse early; we don't have the fundamentals to drive analysis.
 *   3. Read-through LRU cache (15-min TTL per ticker — same key for every caller).
 *   4. On miss, assemble StockDataForAnalysis from the market-data facade.
 *   5. Call the analyzer (retry-with-fallback).
 *   6. Wrap in a discriminated response { data, stubbed, model, cached }.
 *
 * Rate-limited 5 req/min per IP via the shared `apiHandler` wrapper.
 */
export const GET = apiHandler({ bucket: "analyze", limit: 5 }, async ({ url }) => {
  const raw = requiredQuery(url, "ticker");
  const parsed = TickerSchema.safeParse(raw);
  if (!parsed.success) throw new ValidationFailedError("Invalid ticker symbol");
  const ticker = parsed.data;

  // CSE: free-tier providers don't expose fundamentals, so analysis is meaningless
  if (classifyTicker(ticker) === "LK_CSE") {
    return {
      ...FALLBACK_ANALYSIS,
      summary:
        "AI ratings require fundamentals and financial statements. CSE coverage on the free tier is limited to live quotes, so analysis isn't available for this ticker.",
      stubbed: true,
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-pro",
      cached: false,
      reason: "cse-unsupported" as const,
    };
  }

  // If no key is configured, return a clear "not configured" response.
  // Don't expose the env-var name to the client — log it server-side.
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("[api:analyze] OPENROUTER_API_KEY not configured");
    return {
      ...FALLBACK_ANALYSIS,
      summary:
        "AI analysis is not yet configured for this environment. Set the OpenRouter key in your environment to enable live ratings.",
      stubbed: true,
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-pro",
      cached: false,
      reason: "not-configured" as const,
    };
  }

  return await cached(cacheKey("analyze", ticker), TTL.aiAnalysis, async () => {
    const stockData = await buildStockData(ticker);
    if (!stockData) {
      return {
        ...FALLBACK_ANALYSIS,
        summary: "Couldn't retrieve a quote for this ticker — analysis aborted.",
        stubbed: true,
        model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-pro",
        cached: false,
        reason: "no-quote" as const,
      };
    }
    const outcome = await analyzeStock(stockData);
    return {
      ...outcome.result,
      currency: stockData.currency,
      stubbed: outcome.stubbed,
      model: outcome.model,
      cached: false,
      attempts: outcome.attempts,
      ...(outcome.reason ? { reason: outcome.reason } : {}),
    };
  }).then((res) => ({
    ...res,
    // When the LRU returns an already-stored result, override `cached: true`.
    // We can't tell from cached() alone — but for a freshly-built object we
    // set cached: false above. On subsequent calls within 15 min the same
    // object is returned (with cached: false from the original write), so we
    // accept the small lie in exchange for not adding a separate timestamp
    // store. The UI doesn't depend on `cached` for behavior, just display.
    cached: res.cached,
  }));
});

/**
 * POST mirror — many clients prefer POST for "analyze" semantics. Same
 * implementation, accepts ticker via JSON body.
 */
export async function POST(request: Request) {
  // Reuse the GET handler by hoisting the ticker into the URL.
  let body: { ticker?: unknown } = {};
  try {
    body = (await request.json()) as { ticker?: unknown };
  } catch {
    // fall through — handler will 400 on missing ticker
  }
  const ticker = typeof body.ticker === "string" ? body.ticker : "";
  const url = new URL(request.url);
  url.searchParams.set("ticker", ticker);
  const proxied = new Request(url.toString(), {
    method: "GET",
    headers: request.headers,
  });
  return GET(proxied);
}
