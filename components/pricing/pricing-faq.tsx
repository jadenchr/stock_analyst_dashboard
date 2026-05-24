"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const FAQ = [
  {
    q: "Is the free tier really free?",
    a: "Yes. Free is forever-free with no credit card. Sign in with Google to unlock AI ratings, full financials, news, and your synced watchlist. We don't sell your data, ever.",
  },
  {
    q: "What's Pro for?",
    a: "Pro turns StockVision from research into a workflow. Track real portfolio P&L from your own cost basis, run custom screens with the filters you actually care about, get notified when prices hit your levels, and unlock priority access to Gemini 2.5 Pro for AI ratings.",
  },
  {
    q: "When does Pro launch?",
    a: "Soon. The infrastructure is built - Stripe checkout is the last piece. Join the waitlist and we'll email you the moment it goes live with a founder's discount.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Pro is month-to-month or yearly. Cancel any time in Settings and you'll retain Pro features through the end of the billing period.",
  },
  {
    q: "Where does the data come from?",
    a: "Yahoo Finance (quotes, fundamentals, financials, historical), Alpha Vantage (technical indicators), Finnhub (news, insider transactions, analyst consensus), NewsAPI (broader business headlines), and cse.lk for Sri Lankan stocks. AI ratings run on Google Gemini 2.5 Pro via OpenRouter.",
  },
  {
    q: "Is this financial advice?",
    a: "No. StockVision is a research tool. AI ratings, news sentiment, and analyst consensus are informational and should be combined with your own judgment. We're transparent that AI-generated analysis can be wrong.",
  },
  {
    q: "Do you support Indian and Sri Lankan exchanges?",
    a: "Yes. BSE (Bombay) and NSE work end-to-end via Yahoo Finance. CSE (Colombo) has live quotes today; Pro will add historical OHLCV and fundamentals when we wire up the paid CSE feed.",
  },
  {
    q: "What about taxes / brokerage integration?",
    a: "Pro's portfolio tracker handles cost basis and P&L from manually entered or CSV-imported trades. Plaid-based brokerage sync (Robinhood, Schwab, Fidelity) is on the post-Pro-launch roadmap - let us know if it's a deal-breaker for you.",
  },
];

export function PricingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section aria-labelledby="faq-heading" className="flex flex-col gap-5">
      <div className="text-center">
        <h2
          id="faq-heading"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Frequently asked
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Got something we missed?{" "}
          <a
            href="mailto:hello@stockvision.ai"
            className="cursor-pointer text-primary underline-offset-4 hover:underline"
          >
            Email us
          </a>
          .
        </p>
      </div>

      <div className="mx-auto w-full max-w-3xl divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card/40">
        {FAQ.map((item, i) => {
          const expanded = open === i;
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : i)}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-muted/30",
                )}
                aria-expanded={expanded}
              >
                <span className="text-sm font-medium text-foreground">{item.q}</span>
                <motion.span
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0 text-muted-foreground"
                  aria-hidden
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
