import { Info } from "lucide-react";

interface Props {
  exchange: "CSE";
  sections: string[];
}

/**
 * Inline notice shown when an exchange (currently CSE) doesn't expose certain
 * data through free-tier providers. Keeps the page honest instead of showing
 * empty cards or spinners forever.
 */
export function ExchangeLimitedNotice({ exchange, sections }: Props) {
  const exchangeName =
    exchange === "CSE" ? "Colombo Stock Exchange (CSE)" : exchange;

  return (
    <section
      role="status"
      aria-live="polite"
      className="glass flex items-start gap-3 rounded-2xl border-l-2 border-l-neutral/70 p-4"
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral/10 ring-1 ring-neutral/30">
        <Info className="h-4 w-4 text-neutral" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          {exchangeName} data is limited on the free tier
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Live quote and search work — but{" "}
          <span className="text-foreground/85">{sections.join(", ")}</span>{" "}
          would require a paid CSE market-data feed. The dashboard surfaces only what
          can be sourced honestly today.
        </p>
      </div>
    </section>
  );
}
