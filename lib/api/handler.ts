import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { clientKey, rateLimit, type RateLimitResult } from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/security/sanitize";
import { ProviderError, RateLimitedError, TickerNotFoundError, ValidationFailedError } from "@/lib/market-data/errors";

interface BuildHandlerOptions {
  bucket: string;
  limit?: number;
  windowMs?: number;
}

interface HandlerContext {
  request: Request;
  url: URL;
}

const DEFAULT_LIMIT = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? "30");
const DEFAULT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW_MS ?? "60000");

/**
 * Wrap a route handler with rate limiting, error normalization, and
 * uniform JSON responses. Every API route in this app uses this helper.
 */
export function apiHandler<T>(
  options: BuildHandlerOptions,
  handler: (ctx: HandlerContext) => Promise<T>,
) {
  return async (request: Request): Promise<NextResponse> => {
    const url = new URL(request.url);
    const key = clientKey(request.headers);
    const rl: RateLimitResult = rateLimit({
      bucket: options.bucket,
      key,
      limit: options.limit ?? DEFAULT_LIMIT,
      windowMs: options.windowMs ?? DEFAULT_WINDOW,
    });

    const baseHeaders: Record<string, string> = {
      "X-RateLimit-Limit": String(options.limit ?? DEFAULT_LIMIT),
      "X-RateLimit-Remaining": String(rl.remaining),
      "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
      "Cache-Control": "no-store",
    };

    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", resetAt: rl.resetAt },
        { status: 429, headers: { ...baseHeaders, "Retry-After": "60" } },
      );
    }

    try {
      const data = await handler({ request, url });
      return NextResponse.json({ data }, { headers: baseHeaders });
    } catch (err) {
      // Map typed errors → status codes
      if (err instanceof TickerNotFoundError) {
        return NextResponse.json({ error: "Not found" }, { status: 404, headers: baseHeaders });
      }
      if (err instanceof ValidationFailedError) {
        return NextResponse.json(
          { error: err.message },
          { status: 400, headers: baseHeaders },
        );
      }
      if (err instanceof RateLimitedError) {
        return NextResponse.json(
          { error: "Upstream rate limit" },
          { status: 429, headers: baseHeaders },
        );
      }
      if (err instanceof ProviderError) {
        logServerError(`api:${options.bucket}`, err);
        // Don't leak provider names to client
        return NextResponse.json(
          { error: "Upstream unavailable" },
          { status: 502, headers: baseHeaders },
        );
      }
      if (err instanceof ZodError) {
        logServerError(`api:${options.bucket}`, err);
        return NextResponse.json(
          { error: "Invalid request" },
          { status: 400, headers: baseHeaders },
        );
      }
      logServerError(`api:${options.bucket}`, err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: baseHeaders },
      );
    }
  };
}

/**
 * Read and validate a required query param.
 */
export function requiredQuery(url: URL, name: string): string {
  const v = url.searchParams.get(name);
  if (!v) throw new ValidationFailedError(`Missing query param: ${name}`);
  return v;
}

/**
 * Read an optional query param with a default.
 */
export function optionalQuery(url: URL, name: string, fallback: string): string {
  return url.searchParams.get(name) ?? fallback;
}
