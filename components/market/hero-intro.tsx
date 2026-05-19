"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useSearch } from "@/lib/store/search";
import { LiquidEther } from "@/components/effects/liquid-ether";

export function HeroIntro() {
  const openSearch = useSearch((s) => s.setOpen);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/40">
      {/* Layered background — Liquid Ether + aurora + soft grid + radial vignette */}
      <LiquidEther intensity={0.22} />
      <div className="bg-aurora absolute inset-0" aria-hidden />
      <div className="bg-grid absolute inset-0 opacity-50" aria-hidden />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(var(--background)/0.45)_90%)]"
        aria-hidden
      />

      <div className="relative flex flex-col gap-6 p-7 sm:p-12">
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium tracking-wide text-primary"
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          Live · multi-provider intelligence
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]"
        >
          Analyst-grade intelligence for{" "}
          <span className="gradient-text">every public stock</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base"
        >
          Search any ticker for an institutional-grade view: live fundamentals, technicals,
          AI ratings, analyst consensus, news sentiment, and insider activity — all in one
          terminal-fast workspace.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-wrap items-center gap-3"
        >
          <button
            type="button"
            onClick={() => openSearch(true)}
            className="group inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_6px_20px_-6px_hsl(var(--primary)/0.6)] transition-all duration-200 ease-out-expo hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-8px_hsl(var(--primary)/0.7)]"
          >
            Search a stock
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
            <kbd className="ml-1 inline-flex items-center rounded border border-primary-foreground/20 bg-primary-foreground/10 px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
          <span className="hint-chip">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-bull" />
            Live · Yahoo · Alpha Vantage · Finnhub
          </span>
        </motion.div>
      </div>
    </section>
  );
}
