import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/supabase/server";
import { createPortalSession, isStripeConfigured } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe Customer Portal launcher. Used from /settings.
 * Redirects the user to Stripe's hosted billing page where they can
 * update card, change plan, cancel, view invoices.
 */
export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ ok: false, error: "stripe-not-configured" }, { status: 503 });
  }
  const { user, profile } = await getCurrentSession();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in" }, { status: 401 });
  }
  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { ok: false, error: "No billing record - subscribe first" },
      { status: 400 },
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "https://stockvision-ai.vercel.app";
  const origin = appUrl.startsWith("http") ? appUrl : `https://${appUrl}`;

  try {
    const session = await createPortalSession({
      customerId: profile.stripe_customer_id,
      returnUrl: `${origin}/settings`,
    });
    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[billing/portal]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "portal failed" },
      { status: 500 },
    );
  }
}
