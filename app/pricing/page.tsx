import type { Metadata } from "next";
import { PricingHero } from "@/components/pricing/pricing-hero";
import { PricingPlans } from "@/components/pricing/pricing-plans";
import { PricingFeatureMatrix } from "@/components/pricing/pricing-feature-matrix";
import { PricingFaq } from "@/components/pricing/pricing-faq";
import { isStripeConfigured, priceIdFor } from "@/lib/billing/stripe";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free for everyone, Pro and Max for serious investors. Compare plans for StockVision's AI analyst ratings, portfolio tracking, custom screeners, and price alerts.",
  openGraph: {
    title: "StockVision Pricing",
    description:
      "Free for everyone, Pro for serious investors. AI ratings, portfolio tracking, custom screeners, alerts.",
  },
};

export default function PricingPage() {
  // Compute on the server which plans have Stripe wired up. Each plan
  // is "live" only when BOTH monthly + yearly price IDs are set; otherwise
  // we fall back to the waitlist button for that plan.
  const stripeReady = isStripeConfigured();
  const proReady =
    stripeReady && priceIdFor("pro", "monthly") != null && priceIdFor("pro", "yearly") != null;
  const maxReady =
    stripeReady && priceIdFor("max", "monthly") != null && priceIdFor("max", "yearly") != null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 pb-16 pt-2 sm:gap-24">
      <PricingHero />
      <PricingPlans liveTiers={{ pro: proReady, max: maxReady }} />
      <PricingFeatureMatrix />
      <PricingFaq />
    </div>
  );
}
