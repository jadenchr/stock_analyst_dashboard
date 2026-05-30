import { vi } from "vitest";

/**
 * Build a fake NextRequest-compatible Request with a JSON body.
 */
export function makeRequest(
  url: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Request {
  const headers = new Headers({
    "content-type": "application/json",
    "x-forwarded-for": "127.0.0.1",
    ...init.headers,
  });
  return new Request(url, {
    method: init.method ?? "GET",
    body: init.body ? JSON.stringify(init.body) : undefined,
    headers,
  });
}

/**
 * Helper that returns a Supabase-like chainable mock. Useful when we
 * just need the route handler to "succeed" with a canned row.
 */
export function chainable<T>(result: { data: T; error: null | { code?: string; message: string } }) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "in",
    "is",
    "order",
    "limit",
    "single",
    "maybeSingle",
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => {
      // Terminal methods return the result promise; chain otherwise.
      if (m === "single" || m === "maybeSingle") return Promise.resolve(result);
      return chain;
    });
  }
  // Calling `.from()` returns the same chain.
  chain.from = vi.fn(() => chain);
  // `await chain` should resolve to the result for chains that don't end
  // in single/maybeSingle (e.g. PATCH .update().eq().eq() chains).
  (chain as { then: (resolve: (value: typeof result) => void) => void }).then = (resolve) =>
    resolve(result);
  return chain as unknown as {
    from: (table: string) => unknown;
  } & Record<string, unknown>;
}
