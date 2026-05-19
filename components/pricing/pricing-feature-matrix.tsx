import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type Tier = "guest" | "free" | "pro";

interface Row {
  category: string;
  feature: string;
  guest: boolean | string;
  free: boolean | string;
  pro: boolean | string;
}

const ROWS: Row[] = [
  // Market data
  { category: "Markets", feature: "Live quotes (US, India, Sri Lanka, UK, crypto)", guest: true, free: true, pro: true },
  { category: "Markets", feature: "Interactive TradingView chart + indicators", guest: true, free: true, pro: true },
  { category: "Markets", feature: "Indices, sector heatmap, regional spotlight", guest: true, free: true, pro: true },
  { category: "Markets", feature: "Top movers (Day gainers / losers)", guest: true, free: true, pro: true },

  // Research
  { category: "Research", feature: "AI Analyst Rating (Gemini 2.5 Pro)", guest: false, free: true, pro: true },
  { category: "Research", feature: "5-tab financials grid", guest: false, free: true, pro: true },
  { category: "Research", feature: "News + sentiment classification", guest: false, free: true, pro: true },
  { category: "Research", feature: "Insider transactions & analyst consensus", guest: false, free: true, pro: true },
  { category: "Research", feature: "Priority AI model queue", guest: false, free: false, pro: true },

  // Workflow
  { category: "Workflow", feature: "Watchlist with cross-device sync", guest: "Local only", free: true, pro: true },
  { category: "Workflow", feature: "Portfolio tracker (cost basis + P&L)", guest: false, free: false, pro: true },
  { category: "Workflow", feature: "CSV import / export", guest: false, free: false, pro: true },
  { category: "Workflow", feature: "Price alerts (email + push)", guest: false, free: false, pro: "Up to 25" },
  { category: "Workflow", feature: "Earnings calendar", guest: false, free: false, pro: true },

  // Screens
  { category: "Screeners", feature: "Preset screens (5)", guest: false, free: true, pro: true },
  { category: "Screeners", feature: "Custom filter builder", guest: false, free: false, pro: true },
  { category: "Screeners", feature: "Pro-only screens (Undervalued, Top Institutional)", guest: false, free: false, pro: true },

  // International
  { category: "International", feature: "Bombay (BSE) + NSE coverage", guest: true, free: true, pro: true },
  { category: "International", feature: "CSE live quotes", guest: true, free: true, pro: true },
  { category: "International", feature: "CSE historical + fundamentals", guest: false, free: false, pro: true },
];

const TIERS: { id: Tier; label: string; highlight?: boolean }[] = [
  { id: "guest", label: "Guest" },
  { id: "free", label: "Free" },
  { id: "pro", label: "Pro", highlight: true },
];

export function PricingFeatureMatrix() {
  // Group by category for clean section dividers
  const grouped = ROWS.reduce<Record<string, Row[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  return (
    <section aria-labelledby="matrix-heading" className="flex flex-col gap-5">
      <div className="text-center">
        <h2
          id="matrix-heading"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Compare features
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The fine print, without the fine print.
        </p>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card/80 backdrop-blur">
              <tr className="border-b border-border/60 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Feature
                </th>
                {TIERS.map((t) => (
                  <th
                    key={t.id}
                    scope="col"
                    className={cn(
                      "w-28 px-4 py-3 text-center font-semibold",
                      t.highlight && "text-primary",
                    )}
                  >
                    {t.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([category, rows]) => (
                <FeatureCategoryRows key={category} category={category} rows={rows} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function FeatureCategoryRows({ category, rows }: { category: string; rows: Row[] }) {
  return (
    <>
      <tr className="bg-muted/40">
        <th
          colSpan={4}
          scope="rowgroup"
          className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          {category}
        </th>
      </tr>
      {rows.map((row) => (
        <tr
          key={row.feature}
          className="border-b border-border/30 transition-colors last:border-b-0 hover:bg-muted/20"
        >
          <td className="px-4 py-3 text-left text-foreground/90">{row.feature}</td>
          {TIERS.map((t) => (
            <td key={t.id} className="px-4 py-3 text-center">
              <Cell value={row[t.id]} highlight={t.highlight} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Cell({ value, highlight }: { value: boolean | string; highlight?: boolean }) {
  if (value === true) {
    return (
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full",
          highlight ? "bg-primary/15 text-primary" : "bg-bull/15 text-bull",
        )}
      >
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted/60 text-muted-foreground/50">
        <Minus className="h-3 w-3" aria-hidden />
      </span>
    );
  }
  return (
    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{value}</span>
  );
}
