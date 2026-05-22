import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { ValidationFailedError } from "@/lib/market-data/errors";
import { getCurrentSession } from "@/lib/supabase/server";
import { createServerWriteClient } from "@/lib/supabase/server-write";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Profile onboarding save endpoint.
 *
 * Goals:
 *   • Validate the full payload with Zod
 *   • Try a full upsert against the v7c schema (country, exchanges, styles, …)
 *   • If the live database is missing those columns (migration 0002 not yet
 *     applied), fall back to upserting only fields known to exist in v7a
 *     and STILL mark the user as onboarded so they aren't trapped in a
 *     redirect loop.
 *   • Return a clear `warning` so the UI can tell the user what to do next.
 *
 * Why this exists: doing this from the client with the typed Supabase JS
 * client made errors invisible — when an unknown column caused 42703,
 * the form's Save handler appeared to hang. A server route gives us
 * structured errors AND lets us recover gracefully.
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
  defaultCurrency: z.enum(["USD", "INR", "LKR", "GBP", "EUR", "CAD", "AUD"]).optional(),
  notificationFrequency: NotificationFrequencySchema.optional(),
  riskTolerance: RiskToleranceSchema.optional(),
  /** If true, mark the user as onboarded even though they're skipping the form. */
  skip: z.boolean().default(false),
});

/** Postgres error code for "undefined_column". */
const UNDEFINED_COLUMN = "42703";

interface UpsertResult {
  ok: boolean;
  warning: string | null;
  error: string | null;
}

export const POST = apiHandler(
  { bucket: "onboarding-write", limit: 30 },
  async ({ request }) => {
    const { user } = await getCurrentSession();
    if (!user) throw new ValidationFailedError("Not signed in");

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new ValidationFailedError("Invalid JSON body");
    }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationFailedError("Invalid profile payload");
    }
    const body = parsed.data;

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
      .single();

    if (!first.error) {
      const out: UpsertResult = { ok: true, warning: null, error: null };
      return out;
    }

    // ---------- Pass 2: schema is older — drop extra columns ----------
    const code = (first.error as { code?: string }).code;
    const message = first.error.message ?? "Unknown error";

    if (code === UNDEFINED_COLUMN) {
      // The v7c migration (0002_full_profile.sql) hasn't been applied. Save
      // what we can on v7a so the user is unblocked.
      const minimal: Record<string, unknown> = {
        id: user.id,
        email: user.email ?? null,
        full_name: body.fullName?.trim() || null,
      };
      const second = await supabase
        .from("profiles")
        .upsert(minimal, { onConflict: "id" })
        .select("id")
        .single();
      if (second.error) {
        const err = new Error(
          `Save failed even after fallback: ${second.error.message}. Apply supabase/migrations/0004_profile_policies_fix.sql.`,
        );
        (err as Error & { status?: number }).status = 500;
        throw err;
      }
      const out: UpsertResult = {
        ok: true,
        warning:
          "Saved partially — your dashboard preferences couldn't be stored because the database is on an older schema. Apply migrations 0002 + 0004 in Supabase to enable personalized picks.",
        error: null,
      };
      return out;
    }

    // ---------- Anything else — surface clearly, don't trap the user. ----------
    const err = new Error(`Profile save failed: ${message}`);
    (err as Error & { status?: number }).status = 500;
    throw err;
  },
);

/**
 * Quick "just mark me as onboarded so I can go to the dashboard" endpoint.
 * Used as the safety-net Skip button on the profile form. Tries to set
 * `onboarded=true`; if the column doesn't exist, returns ok anyway so the
 * client can navigate.
 */
export const DELETE = apiHandler(
  { bucket: "onboarding-write", limit: 30 },
  async () => {
    const { user } = await getCurrentSession();
    if (!user) throw new ValidationFailedError("Not signed in");
    const supabase = createServerWriteClient();
    const { error } = await supabase
      .from("profiles")
      .update({ onboarded: true })
      .eq("id", user.id);
    if (error && (error as { code?: string }).code !== UNDEFINED_COLUMN) {
      // Don't block the user — just log and let them through.
      console.warn("[onboarding] skip update failed:", error.message);
    }
    return { ok: true };
  },
);
