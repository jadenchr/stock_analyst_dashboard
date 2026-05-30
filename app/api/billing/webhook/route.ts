import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSubscription, tierFromPriceId, verifyWebhook } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook. Listen for subscription lifecycle events and keep
 * profiles.subscription_tier + the stripe_* columns in sync.
 *
 * Events handled:
 *   checkout.session.completed             -> first activation
 *   customer.subscription.created/updated  -> tier + status changes
 *   customer.subscription.deleted          -> drop back to free
 *
 * Needs: SUPABASE_SERVICE_ROLE_KEY, STRIPE_WEBHOOK_SECRET.
 */

interface SessionObject {
  customer?: string;
  subscription?: string;
}

interface SubObject {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: number;
  items?: { data: Array<{ price: { id: string } }> };
  metadata?: { user_id?: string };
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "stripe-webhook-secret-missing" },
      { status: 503 },
    );
  }
  const signatureHeader = request.headers.get("stripe-signature");
  if (!signatureHeader) {
    return NextResponse.json({ ok: false, error: "missing signature" }, { status: 400 });
  }
  const payload = await request.text();

  let event;
  try {
    event = verifyWebhook({ payload, signatureHeader, secret });
  } catch (err) {
    console.error("[billing/webhook] verify", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "verify failed" },
      { status: 400 },
    );
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "service-role not configured" },
      { status: 503 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as unknown as SessionObject;
        if (session.subscription) {
          const sub = (await getSubscription(session.subscription)) as SubObject;
          await applySubscription(admin, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as unknown as SubObject;
        await applySubscription(admin, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as unknown as SubObject;
        await admin
          .from("profiles")
          .update({
            subscription_tier: "free",
            stripe_subscription_id: null,
            stripe_price_id: null,
            stripe_status: "canceled",
            current_period_end: null,
            cancel_at_period_end: false,
          })
          .eq("stripe_customer_id", sub.customer);
        break;
      }
      default:
        // We log the event type for observability but don't error.
        console.log("[billing/webhook] ignored", event.type);
    }
  } catch (err) {
    console.error("[billing/webhook] handler", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

async function applySubscription(
  admin: NonNullable<ReturnType<typeof createServiceClient>>,
  sub: SubObject,
) {
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const tier = tierFromPriceId(priceId);
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  // The customer's user id is on the subscription metadata (we set it
  // at checkout) - fall back to looking the customer up by id.
  const userId = sub.metadata?.user_id;
  const matchColumn = userId ? "id" : "stripe_customer_id";
  const matchValue = userId ?? sub.customer;

  await admin
    .from("profiles")
    .update({
      subscription_tier: tier,
      stripe_customer_id: sub.customer,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      stripe_status: sub.status,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end,
    })
    .eq(matchColumn, matchValue);
}
