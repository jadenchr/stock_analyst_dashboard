import { Brain, LineChart, Newspaper, ShieldCheck } from "lucide-react";

const ITEMS = [
  {
    icon: LineChart,
    title: "Live charts & indicators",
    body: "TradingView candlesticks with overlays for SMA, EMA, Bollinger Bands, MACD and RSI.",
    phase: "Phase 3",
  },
  {
    icon: Brain,
    title: "AI analyst ratings",
    body: "Claude-powered Strong Buy → Strong Sell calls with bull/bear cases and confidence scores.",
    phase: "Phase 4",
  },
  {
    icon: Newspaper,
    title: "News & sentiment",
    body: "Real-time headlines tagged with sentiment, plus insider transactions and SEC filings.",
    phase: "Phase 5",
  },
  {
    icon: ShieldCheck,
    title: "OWASP-hardened API layer",
    body: "Server-side data fetch, Zod-validated routes, rate-limited middleware, no client keys.",
    phase: "Phase 2",
  },
] as const;

export function ComingSoon() {
  return (
    <section aria-labelledby="roadmap-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="roadmap-heading" className="font-display text-2xl tracking-tight text-foreground">
          What ships next
        </h2>
        <p className="text-xs text-muted-foreground">
          The foundation is in place. Each phase below unlocks once API keys are wired up.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="glass flex gap-4 rounded-xl p-4 transition-shadow hover:shadow-elevated"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
                <Icon className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <span className="badge-ticker">{item.phase}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
