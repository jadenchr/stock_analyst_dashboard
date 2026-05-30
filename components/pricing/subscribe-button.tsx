"use client";

import { useState } from "react";
import { Loader2, Sparkles, ExternalLink } from "lucide-react";
import { useUser } from "@/app/auth/user-provider";
import type { Tier } from "@/lib/auth/entitlements";

interface Props {
  tier: "pro" | "max";
  cadence: "monthly" | "yearly";
  currentTier: Tier;
}

/**
 * Real Stripe Checkout entry point. Only rendered when the pricing
 * page server-component determined that the matching Stripe price IDs
 * are configured. Falls back to a graceful sign-in nudge for guests
 * and a portal launcher for users already on this tier.
 */
export function SubscribeButton({ tier, cadence, currentTier }: Props) {
  const { user } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already on this tier - send them to the customer portal instead.
  if (currentTier === tier) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
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
          } finally {
            setBusy(false);
          }
        }}
        className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-bull/30 bg-bull/10 px-4 text-sm font-semibold text-bull transition-colors hover:bg-bull/15"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        )}
        Manage subscription
        {error && <span className="sr-only">{error}</span>}
      </button>
    );
  }

  if (!user) {
    return (
      <a
        href={`/auth/signin?next=${encodeURIComponent("/pricing")}`}
        className="group inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated"
      >
        Sign in to subscribe
      </a>
    );
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, cadence }),
      });
      const body = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (res.ok && body.url) {
        window.location.assign(body.url);
        return;
      }
      setError(body.error ?? `Checkout failed (${res.status})`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="group inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated disabled:cursor-wait disabled:opacity-70"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
        )}
        Subscribe to {tier === "pro" ? "Pro" : "Max"}
      </button>
      {error && (
        <p className="text-[11px] text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
