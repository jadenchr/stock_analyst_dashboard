import Link from "next/link";
import { ArrowRight, Crown, Info } from "lucide-react";

interface Props {
  exchange: "CSE";
  sections: string[];
}

/**
 * Inline notice shown on CSE stock pages, since most upstream data we
 * rely on for US tickers (fundamentals, financials, historical OHLCV,
 * insider, analyst consensus) is not available through cse.lk's free
 * endpoints. Surfaces the gap upfront with a Pro CTA so users know
 * exactly where the experience ends.
 */
export function ExchangeLimitedNotice({ exchange, sections }: Props) {
  const exchangeName =
    exchange === "CSE" ? "Colombo Stock Exchange (CSE)" : exchange;

  return (
    <section
      role="status"
      aria-live="polite"
      className="glass relative overflow-hidden rounded-2xl border-l-2 border-l-neutral/70"
    >
      <div className="bg-aurora pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral/10 ring-1 ring-neutral/30">
            <Info className="h-4 w-4 text-neutral" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {exchangeName} data is limited on the free tier
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Live quote and search work end-to-end. Pro unlocks{" "}
              <span className="text-foreground/85">{sections.join(", ")}</span> for CSE tickers
              when we wire up the paid feed.
            </p>
          </div>
        </div>
        <Link
          href="/pricing"
          className="group ml-auto inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/25 sm:shrink-0"
        >
          <Crown className="h-3.5 w-3.5" aria-hidden />
          See Pro
          <ArrowRight
            className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </section>
  );
}
