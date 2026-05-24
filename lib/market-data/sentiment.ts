/**
 * Lightweight, deterministic sentiment classifier for news headlines.
 *
 * Keyword-based and intentionally simple - runs server-side on every news
 * fetch, costs zero API calls. When ANTHROPIC_API_KEY ships in Phase 4, we
 * can swap this for a model call, but the public contract is the same:
 *   input: string  →  output: "positive" | "neutral" | "negative"
 *
 * Tuning notes:
 *   - Weighted lexicons of financial-context words (not generic sentiment).
 *   - Headlines often invert via "miss expectations", "beats estimates" -
 *     the bigrams below capture the most common reversals.
 *   - Returns "neutral" when total |score| < 1 to avoid over-labeling.
 */

// Each entry: word, weight. Weights tuned so a single strong word can decide.
const POSITIVE: ReadonlyArray<readonly [string, number]> = [
  ["beats", 2], ["beat", 2], ["surge", 2], ["surges", 2], ["surging", 2],
  ["rally", 2], ["rallies", 2], ["soar", 2], ["soars", 2], ["soaring", 2],
  ["jump", 1.5], ["jumps", 1.5], ["climb", 1], ["climbs", 1], ["gain", 1], ["gains", 1],
  ["upgrade", 2], ["upgrades", 2], ["upgraded", 2],
  ["raise", 1.5], ["raises", 1.5], ["raised", 1.5],
  ["record high", 2], ["all-time high", 2], ["52-week high", 1.5],
  ["outperform", 2], ["outperforms", 2], ["bullish", 2],
  ["strong", 1], ["robust", 1.5], ["solid", 1], ["exceeds", 2], ["exceeded", 2],
  ["growth", 0.8], ["growing", 0.8], ["expand", 1], ["expansion", 1],
  ["profit", 0.8], ["profitable", 1], ["dividend", 0.5], ["buyback", 1],
  ["partnership", 0.8], ["approval", 1.5], ["approved", 1.5],
  ["win", 1], ["wins", 1], ["winning", 1], ["breakthrough", 2],
  ["positive", 1], ["optimistic", 1.5], ["optimism", 1.5],
];

const NEGATIVE: ReadonlyArray<readonly [string, number]> = [
  ["miss", 2], ["misses", 2], ["missed", 2],
  ["plunge", 2], ["plunges", 2], ["plunging", 2],
  ["tumble", 2], ["tumbles", 2], ["slump", 2], ["slumps", 2],
  ["crash", 2.5], ["crashes", 2.5],
  ["fall", 1], ["falls", 1], ["falling", 1], ["drop", 1], ["drops", 1],
  ["downgrade", 2], ["downgrades", 2], ["downgraded", 2],
  ["cut", 1.5], ["cuts", 1.5], ["slashed", 2], ["slash", 2],
  ["record low", 2], ["52-week low", 1.5],
  ["underperform", 2], ["underperforms", 2], ["bearish", 2],
  ["weak", 1], ["weakness", 1.5], ["sluggish", 1.5], ["disappoint", 2], ["disappointing", 2],
  ["loss", 1.5], ["losses", 1.5], ["losing", 1], ["unprofitable", 2],
  ["lawsuit", 1.5], ["sued", 1.5], ["fraud", 2.5], ["investigation", 1.5],
  ["recall", 1.5], ["delay", 1], ["delays", 1], ["delayed", 1],
  ["layoff", 1.5], ["layoffs", 1.5], ["cuts jobs", 1.5],
  ["bankrupt", 3], ["bankruptcy", 3], ["default", 2],
  ["concern", 1], ["concerns", 1], ["worried", 1.5], ["warning", 1.5],
  ["bearish", 1.5], ["pessimistic", 1.5],
];

// Phrases that flip nearby positive words to negative (and vice versa).
// e.g. "fails to beat" → negative even though "beat" is positive.
const NEGATIONS = ["fails to", "failed to", "didn't", "did not", "not ", "no longer"];

export type Sentiment = "positive" | "neutral" | "negative";

export function classifySentiment(...parts: Array<string | null | undefined>): Sentiment {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  if (!text) return "neutral";

  // Apply negation heuristic: if a negation appears within 12 chars before
  // a positive/negative word, we flip its weight.
  const negationPositions: number[] = [];
  for (const n of NEGATIONS) {
    let idx = 0;
    while ((idx = text.indexOf(n, idx)) !== -1) {
      negationPositions.push(idx + n.length);
      idx += n.length;
    }
  }
  function isNegated(matchAt: number): boolean {
    return negationPositions.some((p) => matchAt > p && matchAt - p <= 12);
  }

  let score = 0;
  for (const [word, weight] of POSITIVE) {
    const idx = text.indexOf(word);
    if (idx === -1) continue;
    score += isNegated(idx) ? -weight : weight;
  }
  for (const [word, weight] of NEGATIVE) {
    const idx = text.indexOf(word);
    if (idx === -1) continue;
    score -= isNegated(idx) ? -weight : weight;
  }

  if (score >= 1) return "positive";
  if (score <= -1) return "negative";
  return "neutral";
}
