import { z } from "zod";

/**
 * Public contract for an AI-generated stock rating. Every field is bounded so
 * the UI can rely on lengths; arrays are min/max constrained so we never get
 * an empty bull/bear case sneaking through. Loose `.coerce` and `.default`s
 * make the model's output more forgiving without compromising the shape.
 */

export const RatingEnum = z.enum([
  "STRONG_BUY",
  "BUY",
  "HOLD",
  "SELL",
  "STRONG_SELL",
]);
export type Rating = z.infer<typeof RatingEnum>;

export const AnalysisSchema = z.object({
  rating: RatingEnum,
  confidence: z.coerce.number().int().min(0).max(100),
  // Some models occasionally return 0; clamp to non-negative — UI handles the 0 case.
  priceTarget: z.coerce.number().nonnegative(),
  targetHorizon: z.string().default("12 months"),
  upside: z.coerce.number(),
  summary: z.string().min(10).max(700),
  bullCase: z.array(z.string()).min(1).max(5),
  bearCase: z.array(z.string()).min(1).max(5),
  keyRisks: z.array(z.string()).min(1).max(5),
  catalysts: z.array(z.string()).min(1).max(5),
  valuation: z.string().min(5).max(280),
  technicals: z.string().min(5).max(280),
  sectorContext: z.string().min(5).max(280),
  lastUpdated: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.string().optional()),
});

export type AnalysisResult = z.infer<typeof AnalysisSchema>;

/**
 * Returned when the model errors out twice in a row, when an API key is
 * missing, or when CSE / unsupported tickers can't supply fundamentals.
 * The route handler attaches `stubbed: true` (separate response field) so
 * the UI can render an honest "unavailable" state.
 */
export const FALLBACK_ANALYSIS: AnalysisResult = {
  rating: "HOLD",
  confidence: 0,
  priceTarget: 0,
  targetHorizon: "12 months",
  upside: 0,
  summary:
    "AI analysis is temporarily unavailable. The data layer is healthy — try refreshing in a few seconds.",
  bullCase: ["Live model call not completed."],
  bearCase: ["Live model call not completed."],
  keyRisks: ["Analysis pipeline returned no result."],
  catalysts: ["Retry once the model service responds."],
  valuation: "Not analyzed.",
  technicals: "Not analyzed.",
  sectorContext: "Not analyzed.",
  lastUpdated: new Date().toISOString(),
};
