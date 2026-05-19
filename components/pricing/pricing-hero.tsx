"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function PricingHero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/40">
      <div className="bg-aurora absolute inset-0" aria-hidden />
      <div className="bg-grid absolute inset-0 opacity-40" aria-hidden />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(var(--background)/0.55)_90%)]"
        aria-hidden
      />

      <div className="relative flex flex-col items-center gap-5 px-6 py-12 text-center sm:px-12 sm:py-16">
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium tracking-wide text-primary"
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          Pricing
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl"
        >
          Pick the plan that <span className="gradient-text">fits your edge</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base"
        >
          Browse markets for free. Sign in to unlock AI ratings, financials, and sentiment. Upgrade
          to Pro for portfolio tracking, custom screeners, and price alerts — the institutional
          tools without the institutional bill.
        </motion.p>
      </div>
    </section>
  );
}
