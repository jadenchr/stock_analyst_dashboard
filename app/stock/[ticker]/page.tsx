import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { classifyTicker, safeTicker } from "@/lib/utils/validators";
import { quote } from "@/lib/market-data";
import { TickerNotFoundError } from "@/lib/market-data/errors";
import { LivePriceHeader } from "@/components/stock/live-price-header";
import { WatchlistToggle } from "@/components/stock/watchlist-toggle";
import { PriceChart } from "@/components/charts/price-chart";
import { MetricsOverview } from "@/components/stock/metrics-overview";
import { FinancialsGrid } from "@/components/stock/financials-grid";
import { AnalystPanel } from "@/components/stock/analyst-panel";
import { AIRatingPlaceholder } from "@/components/stock/ai-rating-placeholder";
import { NewsFeed } from "@/components/stock/news-feed";
import { InsiderFeed } from "@/components/stock/insider-feed";
import { ExchangeLimitedNotice } from "@/components/stock/exchange-limited-notice";

interface PageProps {
  params: Promise<{ ticker: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { ticker: raw } = await params;
  const ticker = safeTicker(decodeURIComponent(raw));
  if (!ticker) return { title: "Not found" };
  return {
    title: `${ticker} · Live quote, fundamentals & AI rating`,
  };
}

export default async function StockPage({ params }: PageProps) {
  const { ticker: raw } = await params;
  const ticker = safeTicker(decodeURIComponent(raw));
  if (!ticker) notFound();

  const region = classifyTicker(ticker);
  const isCSE = region === "LK_CSE";

  // Server-side initial fetch for instant LCP. Failures fall through to client polling.
  let initial: Awaited<ReturnType<typeof quote>> | null = null;
  try {
    initial = await quote(ticker);
  } catch (err) {
    if (err instanceof TickerNotFoundError) notFound();
    // Other provider errors: render shell, client will retry.
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pt-2">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to markets
        </Link>
        <WatchlistToggle symbol={ticker} />
      </div>

      <LivePriceHeader symbol={ticker} initial={initial} />

      {isCSE ? (
        // CSE: free-tier providers only deliver live quote + news search.
        // Show an honest notice instead of empty fundamentals / chart panels.
        <>
          <ExchangeLimitedNotice
            exchange="CSE"
            sections={[
              "fundamentals",
              "historical chart",
              "analyst consensus",
              "insider transactions",
              "financial statements",
            ]}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AIRatingPlaceholder />
            </div>
            <div className="lg:col-span-1">
              <NewsFeed symbol={ticker} />
            </div>
          </div>
        </>
      ) : (
        <>
          <MetricsOverview symbol={ticker} />
          <PriceChart symbol={ticker} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AIRatingPlaceholder />
            </div>
            <div>
              <AnalystPanel symbol={ticker} />
            </div>
          </div>

          <FinancialsGrid symbol={ticker} />

          <NewsFeed symbol={ticker} />

          <InsiderFeed symbol={ticker} />
        </>
      )}

      <footer className="pb-2 pt-4 text-center text-[10px] text-muted-foreground">
        Market data may be delayed up to 15 minutes. AI ratings are informational, not financial
        advice.
      </footer>
    </div>
  );
}
