/**
 * Pure-function technical indicator computations. Operate on closing prices
 * (or any 1D series) and return values aligned to the input index — leading
 * positions are `null` until the lookback fills.
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
  // Seed with SMA of first `period` values
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

export function bollinger(
  values: readonly number[],
  period = 20,
  stdMul = 2,
): { upper: (number | null)[]; mid: (number | null)[]; lower: (number | null)[] } {
  const mid = sma(values, period);
  const upper: (number | null)[] = new Array(values.length).fill(null);
  const lower: (number | null)[] = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const m = mid[i];
    if (m == null) continue;
    let varSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varSum += (values[j] - m) ** 2;
    }
    const stdev = Math.sqrt(varSum / period);
    upper[i] = m + stdev * stdMul;
    lower[i] = m - stdev * stdMul;
  }
  return { upper, mid, lower };
}
