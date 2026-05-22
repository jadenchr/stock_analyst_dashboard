import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/supabase/server";
import { createServerWriteClient } from "@/lib/supabase/server-write";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Profile onboarding save endpoint.
 *
 * Deliberately bypasses the project-wide `apiHandler` wrapper so that
 * server-side database errors surface with their real messages on the
 * client. The wrapper rewrites every non-typed error to a generic
 * "Internal server error" which makes the onboarding form impossible to
 * debug when something fails — that exact masking is what trapped users
 * on the form during the v7c rollout.
 *
 * Behaviour:
 *   1. Validate the payload with Zod (loose — every field optional).
 *   2. Try the full v7c upsert (country, exchanges, styles, …).
 *   3. On Postgres 42703 (undefined_column) — i.e. schema is still v7a —
 *      retry with just the columns guaranteed to exist on v7a.
 *   4. Always return a structured JSON body the form can show verbatim.
 */

const InvestmentStyleSchema = z.enum(["growth", "value", "income", "speculation"]);
const RiskToleranceSchema = z.enum(["conservative", "moderate", "aggressive"]);
const NotificationFrequencySchema = z.enum(["daily", "weekly", "monthly", "never"]);

const BodySchema = z.object({
  fullName: z.string().trim().max(80).optional(),
  country: z.string().min(2).max(8).optional(),
  preferredExchanges: z.array(z.string().min(1).max(16)).max(20).optional(),
  investmentStyles: z.array(InvestmentStyleSchema).max(8).optional(),
  yearsInvesting: z.coerce.number().int().min(0).max(80).optional(),
  defaultCurrency: z
    .enum(["USD", "INR", "LKR", "GBP", "EUR", "CAD", "AUD", "JPY"])
    .optional(),
  notificationFrequency: NotificationFrequencySchema.optional(),
  riskTolerance: RiskToleranceSchema.optional(),
  skip: z.boolean().default(false),
});

const UNDEFINED_COLUMN = "42703";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { ok: false, error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return jsonError(`Invalid payload — ${fieldErrors}`, 400);
  }
  const body = parsed.data;

  const { user } = await getCurrentSession();
  if (!user) {
    return jsonError("Not signed in. Please refresh and try again.", 401);
  }

  const supabase = createServerWriteClient();

  // ---------- Pass 1: full v7c-schema upsert ----------
  const fullPayload: Record<string, unknown> = {
    id: user.id,
    email: user.email ?? null,
    full_name: body.fullName?.trim() || null,
    onboarded: true,
  };
  if (body.country) fullPayload.country = body.country;
  if (body.preferredExchanges) fullPayload.preferred_exchanges = body.preferredExchanges;
  if (body.investmentStyles) fullPayload.investment_styles = body.investmentStyles;
  if (body.yearsInvesting != null) fullPayload.years_investing = body.yearsInvesting;
  if (body.defaultCurrency) fullPayload.default_currency = body.defaultCurrency;
  if (body.notificationFrequency)
    fullPayload.notification_frequency = body.notificationFrequency;
  if (body.riskTolerance) fullPayload.risk_tolerance = body.riskTolerance;

  const first = await supabase
    .from("profiles")
    .upsert(fullPayload, { onConflict: "id" })
    .select("id")
    .maybeSingle();

  if (!first.error) {
    return NextResponse.json(
      { ok: true, warning: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const firstCode = (first.error as { code?: string }).code;
  const firstMessage = first.error.message ?? "Unknown error";
  console.error("[onboarding] full upsert failed:", firstCode, firstMessage);

  // ---------- Pass 2: drop v7c-only columns ----------
  if (firstCode === UNDEFINED_COLUMN) {
    const minimal: Record<string, unknown> = {
      id: user.id,
      email: user.email ?? null,
      full_name: body.fullName?.trim() || null,
    };
    const second = await supabase
      .from("profiles")
      .upsert(minimal, { onConflict: "id" })
      .select("id")
      .maybeSingle();

    if (!second.error) {
      return NextResponse.json(
        {
          ok: true,
          warning:
            "Your preferences couldn't be stored because the database is on an older schema. Run supabase/migrations/0004_profile_policies_fix.sql in your Supabase SQL editor to enable personalized picks.",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("[onboarding] fallback upsert failed:", second.error.message);
    return jsonError(
      `Save failed even on the v7a fallback: ${second.error.message}. Apply migrations 0002 + 0004 in Supabase.`,
      500,
    );
  }

  // ---------- Anything else — surface the real Postgres message ----------
  return jsonError(`Profile save failed: ${firstMessage}`, 500);
}

/**
 * Emergency escape hatch — used by the "Skip & continue" button on the form.
 * Tries to set onboarded=true; if anything fails, still returns ok so the
 * client can navigate away. This endpoint NEVER returns a non-2xx.
 */
export async function DELETE() {
  try {
    const { user } = await getCurrentSession();
    if (user) {
      const supabase = createServerWriteClient();
      await supabase
        .from("profiles")
        .update({ onboarded: true })
        .eq("id", user.id);
    }
  } catch (err) {
    console.warn("[onboarding] skip update failed:", err);
  }
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
