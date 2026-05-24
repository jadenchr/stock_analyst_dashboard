"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Loader2, Sparkles } from "lucide-react";
import { usePicks } from "@/lib/api/client";
import { useUser } from "@/app/auth/user-provider";
import { useExchangeFilter } from "@/lib/store/exchange-filter";
import { cn } from "@/lib/utils";
import { formatCompactMoney, formatCurrency, formatPercent } from "@/lib/utils/format";
import { SkeletonBlock } from "@/components/ui/skeleton-block";

const EXCHANGE_LABEL: Record<string, string> = {
  all: "all markets",
  US: "US",
  IN_NSE: "India NSE",
  IN_BSE: "India BSE",
  LK_CSE: "Sri Lanka CSE",
  CRYPTO: "Crypto",
};

const STYLE_LABEL: Record<string, string> = {
  growth: "Growth",
  value: "Value",
  income: "Income",
  speculation: "Speculation",
  default: "Curated",
};

const RISK_LABEL: Record<string, string> = {
  conservative: "Conservative",
  moderate: "Moderate",
  aggressive: "Aggressive",
  default: "-",
};

/**
 * Personalized picks panel for the home page. Signed-in users get
 * recommendations tailored to their profile (style + risk). Guests get
 * a curated "Most Active" set with a sign-in CTA.
 */
export function ForYou() {
  const { user } = useUser();
  const exchange = useExchangeFilter((s) => s.filter);
  const { data, isLoading, isError } = usePicks({ exchange });
  const picks = data?.picks ?? [];
  const isRegional = exchange !== "all" && exchange !== "US";

  return (
    <section aria-labelledby="for-you-heading" className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h2
            id="for-you-heading"
            className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight text-foreground"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
            </span>
            {user ? "For you" : "Curated for you"}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isRegional ? (
              <>
                Most-active names on{" "}
                <span className="text-foreground/90">{EXCHANGE_LABEL[exchange]}</span>{" "}
                today · refreshed every 5 minutes.
              </>
            ) : user && data && data.basis.style !== "default" ? (
              <>
                Tailored to your <span className="text-foreground/90">{STYLE_LABEL[data.basis.style]}</span>{" "}
                style and <span className="text-foreground/90">{RISK_LABEL[data.basis.risk]}</span> risk
                tolerance · refreshed every 5 minutes.
              </>
            ) : user ? (
              "Most-active names in the markets · refreshed every 5 minutes."
            ) : (
              "Sign in and complete your profile to see picks tailored to your style and risk."
            )}
          </p>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />}
      </div>

      {isError && (
        <div className="glass rounded-xl px-4 py-3 text-xs text-muted-foreground">
          Couldn&rsquo;t load picks right now.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {isLoading && picks.length === 0
          ? Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-44 rounded-xl" />
            ))
          : picks.map((p, i) => {
              const positive = p.changePercent >= 0;
              const Arrow = positive ? ArrowUpRight : ArrowDownRight;
              return (
                <motion.div
                  key={p.symbol}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={`/stock/${p.symbol}`}
                    className="glass group flex h-full cursor-pointer flex-col gap-2 rounded-xl p-4 transition-all duration-200 ease-out-expo hover:-translate-y-0.5 hover:border-border hover:shadow-elevated"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-base font-semibold tracking-wide text-foreground">
                            {p.symbol}
                          </span>
                          <span className="badge-ticker">{p.exchange.slice(0, 8)}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.name}</p>
                      </div>
                      <Arrow
                        className={cn(
                          "h-4 w-4 shrink-0",
                          positive ? "text-bull" : "text-bear",
                        )}
                        aria-hidden
                      />
                    </div>

                    <div className="flex items-end justify-between">
                      <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
                        {formatCurrency(p.price, p.currency)}
                      </p>
                      <p
                        className={cn(
                          "font-mono text-xs tabular-nums",
                          positive ? "text-bull" : "text-bear",
                        )}
                      >
                        {formatPercent(p.changePercent)}
                      </p>
                    </div>

                    <p className="line-clamp-3 border-t border-border/40 pt-2 text-[11px] leading-relaxed text-muted-foreground">
                      {p.rationale}
                    </p>

                    {p.marketCap != null && (
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                        Mkt cap {formatCompactMoney(p.marketCap, p.currency)}
                      </p>
                    )}
                  </Link>
                </motion.div>
              );
            })}
      </div>

    </section>
  );
}
