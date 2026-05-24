/**
 * Typed errors for the data layer. Route handlers map these to HTTP codes
 * via `errorToResponse()` - clients NEVER see raw provider messages.
 */

export class ProviderError extends Error {
  readonly status: number;
  readonly provider: string;
  constructor(provider: string, message: string, status = 502) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.status = status;
  }
}

export class TickerNotFoundError extends Error {
  readonly status = 404 as const;
  readonly ticker: string;
  constructor(ticker: string) {
    super(`Ticker not found: ${ticker}`);
    this.name = "TickerNotFoundError";
    this.ticker = ticker;
  }
}

export class ValidationFailedError extends Error {
  readonly status = 400 as const;
  constructor(message: string) {
    super(message);
    this.name = "ValidationFailedError";
  }
}

export class RateLimitedError extends Error {
  readonly status = 429 as const;
  readonly resetAt: number;
  constructor(resetAt: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitedError";
    this.resetAt = resetAt;
  }
}
