"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bell, Brain, Check, Compass, FolderOpen, Mail, Sparkles, Star, Wallet } from "lucide-react";
import { useState } from "react";
import { useUser } from "@/app/auth/user-provider";
import { ProWaitlistButton } from "./pro-waitlist-button";
import { SubscribeButton } from "./subscribe-button";
import { cn } from "@/lib/utils";

type Cadence = "monthly" | "yearly";

const PRO_MONTHLY = 9;
const PRO_YEARLY = 90;
const MAX_MONTHLY = 29;
const MAX_YEARLY = 290;

interface Plan {
  id: "free" | "pro" | "max";
  name: string;
  tagline: string;
  highlight: boolean;
  features: string[];
  cta: { label: string; href?: string; variant: "free" | "pro" | "max" };
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Sign in with Google",
    highlight: false,
    features: [
      "Live quotes across US, India (NSE/BSE), Sri Lanka (CSE), crypto",
      "TradingView interactive charts with 6 indicators",
      "AI Analyst Rating powered by Gemini 2.5 Pro",
      "5-tab financials grid (valuation, income, balance, cash flow, growth)",
      "Ticker-level news with sentiment classification",
      "Insider transactions & analyst consensus",
      "Watchlist with cross-device sync",
    ],
    cta: { label: "Sign up free", href: "/auth/signin", variant: "free" },
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Serious investing toolkit",
    highlight: true,
    features: [
      "Everything in Free",
      "Portfolio tracker with cost basis + P&L",
      "Custom screener filters (P/E, growth, margin, etc.)",
      "Real-time price alerts (email + push) - up to 25",
      "Pro-only screens (Undervalued Large Caps, Top Institutional)",
      "Earnings calendar with EPS surprise history",
      "Advanced CSE coverage (historical, fundamentals)",
      "Priority Gemini 2.5 Pro queue",
      "Export to CSV",
    ],
    cta: { label: "Join the waitlist", variant: "pro" },
  },
  {
    id: "max",
    name: "Max",
    tagline: "For power users & small funds",
    highlight: false,
    features: [
      "Everything in Pro",
      "Unlimited price alerts",
      "Up to 10 portfolios with attribution",
      "REST API access with 50k req / month",
      "Custom AI prompt - tune the analyst voice to your strategy",
      "Higher Gemini 2.5 Pro quota (5× Pro)",
      "Bulk CSV import (10,000 rows)",
      "Webhook integrations (Slack, Discord, Zapier)",
      "Priority human support",
    ],
    cta: { label: "Join the Max waitlist", variant: "max" },
  },
];

interface PricingPlansProps {
  /** Per-tier flag from the server: when true, render real Stripe Checkout
   *  buttons; when false, fall back to the waitlist button. */
  liveTiers?: { pro?: boolean; max?: boolean };
}

export function PricingPlans({ liveTiers }: PricingPlansProps = {}) {
  const [cadence, setCadence] = useState<Cadence>("yearly");
  const { tier, user } = useUser();
  const yearlyEquivalent = (PRO_YEARLY / 12).toFixed(2);
  const yearlySavings = Math.round((1 - PRO_YEARLY / (PRO_MONTHLY * 12)) * 100);

  return (
    <section aria-labelledby="plans-heading" className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-4">
        <h2 id="plans-heading" className="sr-only">
          Plans
        </h2>
        <div
          role="radiogroup"
          aria-label="Billing cadence"
          className="inline-flex items-center gap-0.5 rounded-full border border-border/70 bg-card/60 p-0.5"
        >
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={cadence === c}
              onClick={() => setCadence(c)}
              className={cn(
                "relative cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-colors duration-150",
                cadence === c
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c}
              {c === "yearly" && (
                <span
                  className={cn(
                    "ml-1.5 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                    cadence === "yearly"
                      ? "border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground"
                      : "border-bull/30 bg-bull/10 text-bull",
                  )}
                >
                  -{yearlySavings}%
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLANS.map((plan, i) => {
          const isCurrentTier =
            (plan.id === "free" && tier === "free") ||
            (plan.id === "pro" && tier === "pro");
          // Resolve price for the row.
          const priceMonthly =
            plan.id === "pro"
              ? PRO_MONTHLY
              : plan.id === "max"
                ? MAX_MONTHLY
                : 0;
          const priceYearly =
            plan.id === "pro" ? PRO_YEARLY : plan.id === "max" ? MAX_YEARLY : 0;
          const yearlyMonthly = priceYearly > 0 ? (priceYearly / 12).toFixed(2) : "0";
          const isFree = plan.id === "free";
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "glass relative flex flex-col overflow-hidden rounded-2xl p-6",
                plan.highlight && "border-primary/50 ring-1 ring-primary/30",
              )}
            >
              {plan.highlight && (
                <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  <Sparkles className="h-2.5 w-2.5" aria-hidden />
                  Most popular
                </span>
              )}

              <header>
                <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                  {plan.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
              </header>

              <div className="mt-6 flex items-baseline gap-1">
                {isFree ? (
                  <>
                    <span className="font-mono text-4xl font-semibold tabular-nums text-foreground">
                      $0
                    </span>
                    <span className="text-xs text-muted-foreground">forever</span>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-4xl font-semibold tabular-nums text-foreground">
                      ${cadence === "monthly" ? priceMonthly : yearlyMonthly}
                    </span>
                    <span className="text-xs text-muted-foreground">/ mo</span>
                  </>
                )}
              </div>
              {!isFree && cadence === "yearly" && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  ${priceYearly} billed yearly · save{" "}
                  <span className="text-bull">${priceMonthly * 12 - priceYearly}</span>
                </p>
              )}
              {!isFree && cadence === "monthly" && (
                <p className="mt-1 text-[11px] text-muted-foreground">Billed monthly</p>
              )}

              <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-xs leading-relaxed text-foreground/90"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                        plan.highlight ? "bg-primary/15 text-primary" : "bg-bull/15 text-bull",
                      )}
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {plan.cta.variant === "pro" ? (
                  liveTiers?.pro ? (
                    <SubscribeButton tier="pro" cadence={cadence} currentTier={tier} />
                  ) : (
                    <ProWaitlistButton cadence={cadence} priceMonthly={PRO_MONTHLY} />
                  )
                ) : plan.cta.variant === "max" ? (
                  liveTiers?.max ? (
                    <SubscribeButton tier="max" cadence={cadence} currentTier={tier} />
                  ) : (
                    <ProWaitlistButton
                      cadence={cadence}
                      priceMonthly={MAX_MONTHLY}
                      label="Join the Max waitlist"
                      tier="max"
                    />
                  )
                ) : (
                  <Link
                    href={plan.cta.href ?? "/"}
                    className={cn(
                      "inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-all duration-200",
                      isCurrentTier
                        ? "cursor-default border-bull/30 bg-bull/10 text-bull"
                        : "border-border/70 bg-card/60 text-foreground hover:-translate-y-px hover:bg-card",
                    )}
                  >
                    {isCurrentTier ? "Your current plan" : plan.cta.label}
                  </Link>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Feature category icons strip */}
      <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3 md:grid-cols-6">
        {[
          { icon: Brain, label: "AI ratings" },
          { icon: Wallet, label: "Portfolio" },
          { icon: Compass, label: "Custom screens" },
          { icon: Bell, label: "Price alerts" },
          { icon: Mail, label: "Email digest" },
          { icon: FolderOpen, label: "CSV export" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-card/40 p-3"
            >
              <Icon className="h-4 w-4 text-primary" aria-hidden />
              <span className="text-[11px] text-muted-foreground">{item.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export { Star };
