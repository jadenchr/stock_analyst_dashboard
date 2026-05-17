import "server-only";
import { safeFetch } from "@/lib/security/allowlist";
import { ProviderError } from "@/lib/market-data/errors";
import { AnalysisSchema, FALLBACK_ANALYSIS, type AnalysisResult } from "./schema";
import { SYSTEM_PROMPT, buildUserPrompt, type StockDataForAnalysis } from "./prompts";

const PROVIDER = "openrouter";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-pro";
const MAX_RETRIES = 2;
const REQUEST_TIMEOUT_MS = 45_000;

export class OpenRouterInsufficientCreditsError extends Error {
  readonly status = 402 as const;
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterInsufficientCreditsError";
  }
}

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new ProviderError(PROVIDER, "OPENROUTER_API_KEY is not set", 503);
  return key;
}

function getModel(): string {
  return process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
}

interface OpenRouterChoice {
  message?: { content?: string | null };
}

interface OpenRouterResponse {
  id?: string;
  model?: string;
  choices?: OpenRouterChoice[];
  error?: { message?: string; code?: number | string };
}

/**
 * Single non-retried call to OpenRouter's chat-completions endpoint.
 * Forces JSON-only output via `response_format` and a low temperature so
 * the model stays factual and consistent.
 */
async function callOpenRouter(userPrompt: string, model: string): Promise<string> {
  const res = await safeFetch(OPENROUTER_URL, {
    method: "POST",
    timeoutMs: REQUEST_TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      // Recommended by OpenRouter so usage is attributed to the app
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "StockVision AI Analyst",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      // Gemini 2.5 Pro is a reasoning model: completion budget covers BOTH
      // hidden reasoning tokens AND visible output. Combined with the
      // 'low' reasoning-effort hint below, 1800 reserves ~1500 for visible
      // JSON — enough for our schema. Production tip: bump to 3000+ once
      // your OpenRouter balance comfortably supports it ($5+ recommended).
      max_tokens: Number(process.env.OPENROUTER_MAX_TOKENS ?? "1800"),
      response_format: { type: "json_object" },
      // OpenRouter-specific: cap reasoning effort so we don't blow the
      // budget on chain-of-thought.
      reasoning: { effort: "low" },
    }),
  });

  if (res.status === 429) {
    throw new ProviderError(PROVIDER, "Rate limited by OpenRouter", 429);
  }
  if (res.status === 401 || res.status === 403) {
    throw new ProviderError(PROVIDER, "OpenRouter authentication failed", 503);
  }
  if (res.status === 402) {
    // OpenRouter's "402 Payment Required" — out of credits. Surface a
    // dedicated error class so the route handler can return a friendly
    // user-facing message instead of a generic "upstream unavailable".
    const body = await res.text().catch(() => "");
    throw new OpenRouterInsufficientCreditsError(body.slice(0, 200));
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ProviderError(PROVIDER, `HTTP ${res.status}: ${body.slice(0, 200)}`, 502);
  }

  const json = (await res.json()) as OpenRouterResponse;
  if (json.error) {
    throw new ProviderError(
      PROVIDER,
      `OpenRouter error: ${json.error.message ?? "unknown"}`,
      502,
    );
  }
  const content = json.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new ProviderError(PROVIDER, "OpenRouter returned empty content", 502);
  }
  return content;
}

/**
 * Strip the most common JSON-wrapping artifacts. Even with
 * `response_format: json_object`, some models occasionally
 * wrap output in markdown fences when the prompt mentions JSON.
 */
function unwrapJson(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

/**
 * Defensive parse. Tries strict JSON.parse first, then a series of
 * permissive repairs for common LLM output mistakes:
 *   • Unquoted property names: {rating: "BUY"} → {"rating": "BUY"}
 *   • Single-quoted property names: {'rating': "BUY"}
 *   • Trailing commas:  {"a": 1,}
 *   • Smart quotes from copy-paste:  “key”
 *
 * Throws on unrecoverable input — the analyzer will retry / fall back.
 */
function permissiveJsonParse(raw: string): unknown {
  // 1. Strict parse
  try {
    return JSON.parse(raw);
  } catch {
    /* try repair below */
  }

  let s = raw;

  // 2. Replace smart quotes with straight quotes
  s = s.replace(/[“”‘’]/g, '"');

  // 3. Quote bare property names — match unquoted keys at object boundaries.
  //    Conservative: only matches keys preceded by `{` or `,` and followed by `:`.
  s = s.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g, '$1"$2":');

  // 4. Convert single-quoted property names (after step 3 there should be few)
  s = s.replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":');

  // 5. Remove trailing commas before } or ]
  s = s.replace(/,(\s*[}\]])/g, "$1");

  return JSON.parse(s);
}

export interface AnalyzeOutcome {
  result: AnalysisResult;
  model: string;
  stubbed: boolean;
  attempts: number;
  reason?: "insufficient-credits" | "model-error" | "validation-error";
}

/**
 * Run the analysis with retries. Returns a discriminated `AnalyzeOutcome` so
 * the route handler can distinguish a real model response from a fallback.
 */
export async function analyzeStock(data: StockDataForAnalysis): Promise<AnalyzeOutcome> {
  const model = getModel();
  const userPrompt = buildUserPrompt(data);
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let raw = "";
    try {
      raw = await callOpenRouter(userPrompt, model);
      const parsed = permissiveJsonParse(unwrapJson(raw));
      const validated = AnalysisSchema.parse(parsed);
      return {
        result: { ...validated, lastUpdated: new Date().toISOString() },
        model,
        stubbed: false,
        attempts: attempt,
      };
    } catch (err) {
      lastError = err;
      // Log a longer preview verbatim (preserving newlines) so we can see
      // the exact byte position the parser tripped on.
      const preview = raw ? raw.slice(0, 800) : "(empty)";
      console.error(
        `[analyzer] attempt ${attempt}/${MAX_RETRIES} failed for ${data.ticker} on ${model}:`,
        err instanceof Error ? err.message : err,
        `\n  raw preview (first 800 chars):\n${preview}\n  ---end preview---`,
      );
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }
  }

  // All retries exhausted — return fallback so the page never crashes
  console.error(`[analyzer] all retries failed for ${data.ticker}:`, lastError);

  const isCreditsError = lastError instanceof OpenRouterInsufficientCreditsError;
  return {
    result: {
      ...FALLBACK_ANALYSIS,
      summary: isCreditsError
        ? "Your OpenRouter account is out of credits. Add at least $5 at https://openrouter.ai/settings/credits to enable AI ratings."
        : FALLBACK_ANALYSIS.summary,
      lastUpdated: new Date().toISOString(),
    },
    model,
    stubbed: true,
    attempts: MAX_RETRIES,
    reason: isCreditsError ? "insufficient-credits" : "model-error",
  };
}
