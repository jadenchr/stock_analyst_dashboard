"use client";

import { motion } from "framer-motion";
import { Brain, Sparkles } from "lucide-react";

/**
 * Placeholder shown while Phase 4 (Claude analyst) is not yet wired.
 * The actual AI-rating component will replace this with a real rating badge,
 * confidence gauge, bull/bear case, etc.
 */
export function AIRatingPlaceholder() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative h-full overflow-hidden rounded-2xl border border-primary/20 bg-card/40"
      aria-label="AI analyst rating"
    >
      <div className="bg-aurora absolute inset-0" aria-hidden />
      <div className="bg-grid absolute inset-0 opacity-30" aria-hidden />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary)/0.18),transparent_60%)]"
        aria-hidden
      />

      <div className="relative flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/40">
          <Brain className="h-6 w-6 text-primary" aria-hidden />
          <motion.span
            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-1 -top-1"
            aria-hidden
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </motion.span>
        </div>
        <div className="space-y-1.5">
          <h3 className="font-display text-2xl font-semibold tracking-tight">
            AI rating arrives in Phase 4
          </h3>
          <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
            A senior-analyst-grade <span className="text-primary">Strong Buy → Strong Sell</span>{" "}
            call from Claude, with confidence score, price target, bull / bear cases, key risks
            and catalysts.
          </p>
        </div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Set ANTHROPIC_API_KEY in .env.local to activate
        </p>
      </div>
    </motion.section>
  );
}
