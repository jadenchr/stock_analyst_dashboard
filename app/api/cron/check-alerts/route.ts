import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import * as md from "@/lib/market-data";
import { alertEmailHtml, sendEmail } from "@/lib/email/resend";
import type { PriceAlertRow } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Alert check cron.
 *
 * Schedule via vercel.json (every 5 min). Each tick:
 *   1. Pulls all active alerts that haven't already triggered.
 *   2. Fetches one live quote per unique symbol (deduped).
 *   3. For every alert whose threshold has been crossed:
 *      - Inserts a notifications row (visible in the bell).
 *      - Sends an email via Resend (if configured).
 *      - Flips active=false + triggered_at=now() so it doesn't
 *        re-fire on the next tick. User can hit "Reset" in the UI
 *        to re-arm it.
 *
 * Auth:
 *   - Cron route, NOT user-facing. Vercel sends a Bearer header with
 *     CRON_SECRET (we set it as an env var). Reject anything else.
 *   - Uses the service-role Supabase client to read across all users.
 */

interface CheckResult {
  ok: boolean;
  checked: number;
  fired: number;
  errors: string[];
  skipped?: string;
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // Dev convenience - no secret set, allow.
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

async function handle(request: Request): Promise<CheckResult> {
  if (!authorized(request)) {
    return { ok: false, checked: 0, fired: 0, errors: ["unauthorized"], skipped: "auth" };
  }
  const admin = createServiceClient();
  if (!admin) {
    return {
      ok: false,
      checked: 0,
      fired: 0,
      errors: ["SUPABASE_SERVICE_ROLE_KEY not set"],
      skipped: "no-service-role",
    };
  }

  // 1) Pull active, never-triggered alerts.
  const { data: alerts, error: fetchErr } = await admin
    .from("price_alerts")
    .select("*")
    .eq("active", true)
    .is("triggered_at", null)
    .limit(500);
  if (fetchErr) {
    return { ok: false, checked: 0, fired: 0, errors: [fetchErr.message] };
  }
  const rows = (alerts ?? []) as PriceAlertRow[];
  if (rows.length === 0) {
    return { ok: true, checked: 0, fired: 0, errors: [] };
  }

  // 2) Dedupe symbols and fetch quotes in parallel.
  const symbols = Array.from(new Set(rows.map((r) => r.symbol)));
  const quoteMap = new Map<string, number>();
  const currencyMap = new Map<string, string>();
  const settled = await Promise.allSettled(symbols.map((s) => md.quote(s)));
  settled.forEach((res, i) => {
    if (res.status === "fulfilled") {
      quoteMap.set(symbols[i], res.value.price);
      currencyMap.set(symbols[i], res.value.currency);
    }
  });

  // 3) For each alert, decide if it crossed.
  const errors: string[] = [];
  let fired = 0;

  // We need user emails for the email send - look them up once.
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const emailMap = new Map<string, string>();
  const profileMap = new Map<string, { full_name: string | null }>();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds);
  for (const p of (profiles ?? []) as Array<{ id: string; email: string | null; full_name: string | null }>) {
    if (p.email) emailMap.set(p.id, p.email);
    profileMap.set(p.id, { full_name: p.full_name });
  }

  for (const alert of rows) {
    const price = quoteMap.get(alert.symbol);
    if (price == null) continue; // quote failed - try next tick.
    const target = Number(alert.target_price);
    const crossed =
      alert.direction === "above" ? price >= target : price <= target;
    if (!crossed) continue;

    // a) Flip the alert flags so we don't re-fire next tick.
    const triggeredAt = new Date().toISOString();
    const { error: updErr } = await admin
      .from("price_alerts")
      .update({ active: false, triggered_at: triggeredAt })
      .eq("id", alert.id);
    if (updErr) {
      errors.push(`update ${alert.id}: ${updErr.message}`);
      continue;
    }

    // b) Drop a notification row for the bell.
    const verb = alert.direction === "above" ? "above" : "below";
    const formattedTarget = formatCurrency(target, alert.currency);
    const formattedNow = formatCurrency(price, alert.currency);
    const title = `${alert.symbol} ${verb} ${formattedTarget}`;
    const body = `Now trading at ${formattedNow}.${alert.note ? " " + alert.note : ""}`;
    const { error: notifErr } = await admin.from("notifications").insert({
      user_id: alert.user_id,
      kind: "alert",
      title,
      body,
      symbol: alert.symbol,
      alert_id: alert.id,
    });
    if (notifErr) errors.push(`notif ${alert.id}: ${notifErr.message}`);

    // c) Email if we have the user's address.
    const email = emailMap.get(alert.user_id);
    if (email) {
      const tmpl = alertEmailHtml({
        symbol: alert.symbol,
        direction: alert.direction,
        target,
        current: price,
        currency: alert.currency,
        note: alert.note,
      });
      const sendRes = await sendEmail({
        to: email,
        subject: tmpl.subject,
        html: tmpl.html,
        text: tmpl.text,
      });
      if (!sendRes.ok && !sendRes.skipped) {
        errors.push(`email ${alert.id}: ${sendRes.error ?? "unknown"}`);
      }
    }

    fired += 1;
  }

  return { ok: true, checked: rows.length, fired, errors };
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 4,
    }).format(value);
  } catch {
    return value.toFixed(2) + " " + currency;
  }
}

export async function GET(request: Request) {
  const result = await handle(request);
  return NextResponse.json(result, {
    status: result.ok ? 200 : result.skipped === "auth" ? 401 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  return GET(request);
}
