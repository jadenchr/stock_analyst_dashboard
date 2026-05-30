import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/supabase/server";
import { createServerWriteClient } from "@/lib/supabase/server-write";
import {
  createCheckoutSession,
  ensureCustomer,
  isStripeConfigured,
  priceIdFor,
} from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  tier: z.enum(["pro", "max"]),
  cadence: z.enum(["monthly", "yearly"]),
});

/**
 * Start a Stripe Checkout session for the requested (tier, cadence).
 * Returns { url } so the client can redirect. If Stripe isn't yet
 * configured, returns 503 with a clear marker the UI can use to fall
 * back to the waitlist button.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { ok: false, error: "stripe-not-configured" },
      { status: 503 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const { user, profile } = await getCurrentSession();
  if (!user || !user.email) {
    return NextResponse.json({ ok: false, error: "Sign in to subscribe" }, { status: 401 });
  }

  const priceId = priceIdFor(parsed.data.tier, parsed.data.cadence);
  if (!priceId) {
    return NextResponse.json(
      { ok: false, error: `Price ID not set for ${parsed.data.tier}:${parsed.data.cadence}` },
      { status: 503 },
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "https://stockvision-ai.vercel.app";
  const origin = appUrl.startsWith("http") ? appUrl : `https://${appUrl}`;
  const successUrl = `${origin}/settings?billing=success`;
  const cancelUrl = `${origin}/pricing?billing=cancel`;

  try {
    const customerId = await ensureCustomer({
      existingId: profile?.stripe_customer_id ?? null,
      email: user.email,
      userId: user.id,
      name: profile?.full_name ?? null,
    });

    // Persist the customer id so we don't recreate it on retries.
    if (!profile?.stripe_customer_id) {
      const write = createServerWriteClient();
      await write.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const session = await createCheckoutSession({
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      userId: user.id,
    });
    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[billing/checkout]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "checkout failed" },
      { status: 500 },
    );
  }
}
