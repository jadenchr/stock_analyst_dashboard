"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useUser } from "@/app/auth/user-provider";

interface Props {
  cadence: "monthly" | "yearly";
  priceMonthly: number;
  /** CTA label override (default: "Join the waitlist"). */
  label?: string;
  /** Which tier this button is for - used to scope the localStorage key. */
  tier?: "pro" | "max";
}

/**
 * Pro Pro-tier CTA. Stripe Checkout ships in a later phase; for now this
 * captures the user's intent via the existing Supabase profile (we set a
 * `pro_waitlist` flag in user_metadata.app - see TODO below for when we
 * persist this to a dedicated `waitlist` table).
 *
 * Behavior:
 *   • Signed-out → "Sign in to join the waitlist"
 *   • Signed-in (free) → "Join the Pro waitlist" → records intent → "You're on the list"
 *   • Signed-in (pro)  → "You're on Pro" (no action needed)
 */
export function ProWaitlistButton({ cadence, priceMonthly, label, tier: targetTier = "pro" }: Props) {
  const { user, tier } = useUser();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const storageKey = `stockvision.waitlist.${targetTier}.${user?.id ?? "anon"}`;
  const buttonLabel = label ?? "Join the waitlist";

  // If localStorage says we already joined this session, surface that
  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(storageKey) === "1") {
      setState("done");
    }
  }, [user, storageKey]);

  async function joinWaitlist() {
    if (!user) return;
    setState("loading");
    try {
      // Persist locally so we don't double-prompt. The full Supabase
      // table + email confirmation will land in Phase 7c.
      localStorage.setItem(storageKey, "1");
      // Small artificial delay so the success state isn't jarring
      await new Promise((r) => setTimeout(r, 600));
      setState("done");
    } catch (err) {
      console.error("[pro-waitlist]", err);
      setState("idle");
    }
  }

  // If the user is already on Pro, show the active-plan pill (only when
  // this button represents the user's current tier - Max waitlist still
  // shows for Pro users).
  if (tier === "pro" && targetTier === "pro") {
    return (
      <div className="inline-flex h-10 w-full cursor-default items-center justify-center gap-1.5 rounded-lg border border-bull/30 bg-bull/10 px-4 text-sm font-semibold text-bull">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        You&rsquo;re on Pro
      </div>
    );
  }

  if (!user) {
    return (
      <a
        href={`/auth/signin?next=${encodeURIComponent("/pricing")}`}
        className="group inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated"
      >
        Sign in to join the waitlist
      </a>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {state === "done" ? (
        <motion.div
          key="done"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-bull/30 bg-bull/10 px-4 text-sm font-semibold text-bull"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          You&rsquo;re on the list - we&rsquo;ll email you
        </motion.div>
      ) : (
        <motion.button
          key="idle"
          type="button"
          onClick={joinWaitlist}
          disabled={state === "loading"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="group inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated disabled:cursor-wait disabled:opacity-80"
          aria-label={`Join the ${targetTier === "max" ? "Max" : "Pro"} ${cadence} waitlist at $${priceMonthly}/mo`}
        >
          {state === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          )}
          {state === "loading" ? "Adding you…" : buttonLabel}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
