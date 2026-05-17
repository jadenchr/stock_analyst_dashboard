import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { ValidationFailedError } from "@/lib/market-data/errors";
import { TickerSchema } from "@/lib/utils/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  ticker: TickerSchema,
});

/**
 * AI rating endpoint. Phase 2 ships a deterministic fallback (HOLD)
 * since no ANTHROPIC_API_KEY is configured yet. Phase 4 wires Claude.
 *
 * Heavily rate-limited (5 req/min) per the security spec.
 */
export const POST = apiHandler({ bucket: "analyze", limit: 5 }, async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationFailedError("Invalid JSON body");
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) throw new ValidationFailedError("Invalid request body");

  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);

  return {
    rating: "HOLD",
    confidence: 50,
    priceTarget: null,
    targetHorizon: "12 months",
    upside: 0,
    summary: hasKey
      ? "AI rating endpoint is configured but the live model call ships in Phase 4."
      : "AI analysis is currently stubbed. Provide ANTHROPIC_API_KEY in .env.local to enable Claude-powered ratings in Phase 4.",
    bullCase: [],
    bearCase: [],
    keyRisks: [],
    catalysts: [],
    valuation: "Not analyzed",
    technicals: "Not analyzed",
    lastUpdated: new Date().toISOString(),
    stubbed: true,
  } as const;
});
