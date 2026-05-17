/**
 * SSRF defense — every outbound URL must match this allowlist before fetch().
 * Hardcoded; never derived from user input.
 */
const ALLOWED_HOSTS = new Set<string>([
  "query1.finance.yahoo.com",
  "query2.finance.yahoo.com",
  "www.alphavantage.co",
  "finnhub.io",
  "newsapi.org",
  "api.anthropic.com",
  "logo.clearbit.com",
  // Colombo Stock Exchange — public website data feed
  "www.cse.lk",
  "cse.lk",
  // OpenRouter — Phase 4 AI provider (brokers Gemini, Claude, GPT-4o, etc.)
  "openrouter.ai",
]);

export class DisallowedHostError extends Error {
  readonly host: string;
  constructor(host: string) {
    super(`Outbound host not on allowlist: ${host}`);
    this.host = host;
    this.name = "DisallowedHostError";
  }
}

/**
 * Validate a URL before fetching. Throws on protocol/host violations.
 * Returns the parsed URL so callers can chain.
 */
export function assertAllowedUrl(url: string | URL): URL {
  const parsed = url instanceof URL ? url : new URL(url);
  if (parsed.protocol !== "https:") {
    throw new DisallowedHostError(parsed.host);
  }
  if (!ALLOWED_HOSTS.has(parsed.host)) {
    throw new DisallowedHostError(parsed.host);
  }
  return parsed;
}

/**
 * fetch() wrapper that enforces the allowlist before issuing the request.
 * All adapter code MUST use this helper instead of raw fetch.
 */
export async function safeFetch(
  url: string | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const parsed = assertAllowedUrl(url);
  const { timeoutMs = 10_000, ...rest } = init ?? {};
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(parsed, {
      ...rest,
      signal: ac.signal,
      // Server-side only; never leak cookies or credentials cross-origin
      credentials: "omit",
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}
