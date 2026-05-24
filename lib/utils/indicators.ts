/**
 * Pure-function technical indicator computations. Operate on closing prices
 * (or any 1D series) and return values aligned to the input index - leading
 * positions are `null` until the lookback fills.
 *
 * Used by `lib/ai/stock-data.ts` to compute price-vs-MA and MACD signal
 * inputs for the AI rating prompt. Cheap to run server-side; no need to
 * burn Alpha Vantage's rate-limited indicator endpoints.
 */

export function sma(values: readonly number[], period: number): (number | null)[] {
  if (period < 1) return values.map(() => null);
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: readonly number[], period: number): (number | null)[] {
  if (period < 1 || values.length === 0) return values.map(() => null);
  const out: (number | null)[] = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  if (values.length < period) return out;
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  let prev = seed / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    const v = values[i] * k + prev * (1 - k);
    out[i] = v;
    prev = v;
  }
  return out;
}
