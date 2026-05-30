import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Thin Stripe REST client + webhook verifier - no SDK dependency.
 *
 * Why no SDK: the official `stripe` package is ~2 MB of dependencies for
 * what we use here (3 endpoints + signature verification). Doing it by
 * hand keeps cold starts fast.
 *
 * Env vars:
 *   STRIPE_SECRET_KEY                  required, server only
 *   STRIPE_WEBHOOK_SECRET              required, server only
 *   STRIPE_PRICE_PRO_MONTHLY           Pro $9/mo  Price ID
 *   STRIPE_PRICE_PRO_YEARLY            Pro $90/yr Price ID
 *   STRIPE_PRICE_MAX_MONTHLY           Max $29/mo Price ID
 *   STRIPE_PRICE_MAX_YEARLY            Max $290/yr Price ID
 *   NEXT_PUBLIC_APP_URL                used to build success/cancel URLs
 */

const STRIPE_API = "https://api.stripe.com/v1";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function getKey(): string {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new Error("STRIPE_SECRET_KEY not set");
  return k;
}

/** Map our (tier, cadence) -> the Stripe Price ID set in env. */
export function priceIdFor(tier: "pro" | "max", cadence: "monthly" | "yearly"): string | null {
  const map: Record<string, string | undefined> = {
    "pro:monthly": process.env.STRIPE_PRICE_PRO_MONTHLY,
    "pro:yearly": process.env.STRIPE_PRICE_PRO_YEARLY,
    "max:monthly": process.env.STRIPE_PRICE_MAX_MONTHLY,
    "max:yearly": process.env.STRIPE_PRICE_MAX_YEARLY,
  };
  return map[`${tier}:${cadence}`] ?? null;
}

/** Stripe's form-urlencoded format with [bracket] nesting for objects. */
function form(body: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined) continue;
    sp.append(k, String(v));
  }
  return sp.toString();
}

async function stripeFetch<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: string } = { method: "GET" },
): Promise<T> {
  const res = await fetch(STRIPE_API + path, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${getKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: init.body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Stripe ${path} -> ${res.status}: ${t.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/* ---------------- customer ---------------- */

export async function ensureCustomer(args: {
  existingId: string | null;
  email: string;
  userId: string;
  name?: string | null;
}): Promise<string> {
  if (args.existingId) return args.existingId;
  const created = await stripeFetch<{ id: string }>("/customers", {
    method: "POST",
    body: form({
      email: args.email,
      name: args.name ?? undefined,
      "metadata[user_id]": args.userId,
    }),
  });
  return created.id;
}

/* ---------------- checkout session ---------------- */

export async function createCheckoutSession(args: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
}): Promise<{ id: string; url: string }> {
  const session = await stripeFetch<{ id: string; url: string }>("/checkout/sessions", {
    method: "POST",
    body: form({
      customer: args.customerId,
      mode: "subscription",
      "line_items[0][price]": args.priceId,
      "line_items[0][quantity]": 1,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      allow_promotion_codes: true,
      "subscription_data[metadata][user_id]": args.userId,
    }),
  });
  return session;
}

/* ---------------- customer portal ---------------- */

export async function createPortalSession(args: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  return stripeFetch<{ url: string }>("/billing_portal/sessions", {
    method: "POST",
    body: form({
      customer: args.customerId,
      return_url: args.returnUrl,
    }),
  });
}

/* ---------------- webhook verification ---------------- */

/**
 * Verify a `Stripe-Signature` header against a raw request body using
 * the webhook signing secret. Returns the parsed event when valid, else
 * throws. Reimplemented from Stripe's official algorithm because we
 * don't ship their SDK.
 */
export function verifyWebhook(args: {
  payload: string;
  signatureHeader: string;
  secret: string;
  toleranceSec?: number;
}): { id: string; type: string; data: { object: Record<string, unknown> } } {
  const tolerance = args.toleranceSec ?? 5 * 60;
  const pairs = args.signatureHeader.split(",").map((p) => p.split("="));
  const tsRaw = pairs.find(([k]) => k === "t")?.[1];
  const v1s = pairs.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!tsRaw || v1s.length === 0) throw new Error("Malformed Stripe-Signature");

  const ts = Number(tsRaw);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > tolerance) throw new Error("Timestamp outside tolerance");

  const signedPayload = `${tsRaw}.${args.payload}`;
  const expected = createHmac("sha256", args.secret).update(signedPayload).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const matches = v1s.some((sig) => {
    const sigBuf = Buffer.from(sig, "hex");
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
  });
  if (!matches) throw new Error("Signature mismatch");

  return JSON.parse(args.payload);
}

/* ---------------- subscription helper ---------------- */

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: number;
  items: { data: Array<{ price: { id: string } }> };
}

export async function getSubscription(id: string): Promise<StripeSubscription> {
  return stripeFetch<StripeSubscription>(`/subscriptions/${id}`);
}

/** Decide which tier a Stripe price ID maps to. */
export function tierFromPriceId(priceId: string | null | undefined): "free" | "pro" | "max" {
  if (!priceId) return "free";
  const max = [process.env.STRIPE_PRICE_MAX_MONTHLY, process.env.STRIPE_PRICE_MAX_YEARLY].filter(
    Boolean,
  );
  if (max.includes(priceId)) return "max";
  const pro = [process.env.STRIPE_PRICE_PRO_MONTHLY, process.env.STRIPE_PRICE_PRO_YEARLY].filter(
    Boolean,
  );
  if (pro.includes(priceId)) return "pro";
  return "free";
}
