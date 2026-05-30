"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { useUser } from "@/app/auth/user-provider";
import { TIER_LABEL } from "@/lib/auth/entitlements";
import { cn } from "@/lib/utils";

/**
 * Billing card. Three states:
 *   - guest        - shouldn't render, /settings is gated
 *   - free         - "Upgrade" CTA -> /pricing
 *   - pro / max    - "Manage" CTA -> Stripe Customer Portal
 *
 * If Stripe isn't wired up the Manage button still tries, gets a
 * 503 from /api/billing/portal, and shows the marker error.
 */
export function SettingsBillingCard() {
  const { profile, tier } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const body = (await res.json()) as { url?: string; error?: string };
      if (res.ok && body.url) {
        window.location.assign(body.url);
        return;
      }
      setError(body.error ?? "Portal unavailable");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  const periodEnd = profile?.current_period_end
    ? new Date(profile.current_period_end).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <section className="glass rounded-2xl p-6">
      <header className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <CreditCard className="h-4 w-4 text-primary" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-base font-semibold text-foreground">Billing</h2>
          <p className="text-xs text-muted-foreground">Plan, payment method, and invoices.</p>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Current plan
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl font-semibold text-foreground">
              {TIER_LABEL[tier]}
            </span>
            {profile?.cancel_at_period_end && (
              <span className="rounded-full border border-bear/30 bg-bear/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-bear">
                Ends {periodEnd ?? "soon"}
              </span>
            )}
            {!profile?.cancel_at_period_end && periodEnd && (
              <span className="text-[11px] text-muted-foreground">Renews {periodEnd}</span>
            )}
          </div>
        </div>

        {tier === "free" ? (
          <Link
            href="/pricing"
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-elevated"
          >
            Upgrade plan
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : (
          <button
            type="button"
            onClick={openPortal}
            disabled={busy}
            className={cn(
              "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-border/70 bg-card/60 px-4 text-sm font-medium text-foreground transition-colors hover:bg-card disabled:cursor-wait disabled:opacity-70",
            )}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            )}
            Manage in Stripe
          </button>
        )}
      </div>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </section>
  );
}
