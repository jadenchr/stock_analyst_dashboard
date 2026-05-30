/**
 * Vitest setup. Forces a clean env for every test run so we don't
 * accidentally hit live providers.
 */
import { vi } from "vitest";

// Pin a deterministic timezone for any Date math.
process.env.TZ = "UTC";

// Stub the next/server cookies() API for route-handler imports. The
// real cookies() throws outside a request context; tests mock it
// per-case via `mockServerSession()` in tests/helpers.ts.
vi.mock("server-only", () => ({}));

// Avoid the real Supabase admin client picking up env vars at import.
// Individual tests override these as needed.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon";
