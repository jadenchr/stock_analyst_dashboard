import type { Metadata } from "next";
import { PricingHero } from "@/components/pricing/pricing-hero";
import { PricingPlans } from "@/components/pricing/pricing-plans";
import { PricingFeatureMatrix } from "@/components/pricing/pricing-feature-matrix";
import { PricingFaq } from "@/components/pricing/pricing-faq";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free for everyone, Pro for serious investors. Compare plans for StockVision's AI analyst ratings, portfolio tracking, custom screeners, and price alerts.",
  openGraph: {
    title: "StockVision Pricing",
    description:
      "Free for everyone, Pro for serious investors. AI ratings, portfolio tracking, custom screeners, alerts.",
  },
};

export default function PricingPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 pb-16 pt-2 sm:gap-24">
      <PricingHero />
      <PricingPlans />
      <PricingFeatureMatrix />
      <PricingFaq />
    </div>
  );
}
