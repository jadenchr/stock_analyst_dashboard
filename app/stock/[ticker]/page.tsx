import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { classifyTicker, safeTicker } from "@/lib/utils/validators";
import { quote } from "@/lib/market-data";
import { TickerNotFoundError } from "@/lib/market-data/errors";
import { LivePriceHeader } from "@/components/stock/live-price-header";
import { WatchlistToggle } from "@/components/stock/watchlist-toggle";
import { CreateAlertButton } from "@/components/stock/create-alert-button";
import { PriceChartSection } from "@/components/charts/price-chart-section";
import { CompanyOverview } from "@/components/stock/company-overview";
import { MetricsOverview } from "@/components/stock/metrics-overview";
import { FinancialsGrid } from "@/components/stock/financials-grid";
import { AnalystPanel } from "@/components/stock/analyst-panel";
import { AIRating } from "@/components/stock/ai-rating";
import { NewsFeed } from "@/components/stock/news-feed";
import { InsiderFeed } from "@/components/stock/insider-feed";
import { ExchangeLimitedNotice } from "@/components/stock/exchange-limited-notice";
import { FeatureGate } from "@/components/auth/feature-gate";

interface PageProps {
  params: Promise<{ ticker: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { ticker: raw } = await params;
  const ticker = safeTicker(decodeURIComponent(raw));
  if (!ticker) return { title: "Not found" };
  return {
    title: `${ticker} · Live quote, fundamentals & AI rating`,
    description: `Live quote, AI analyst rating, fundamentals, news, and insider activity for ${ticker}.`,
  };
}

export default async function StockPage({ params }: PageProps) {
  const { ticker: raw } = await params;
  const ticker = safeTicker(decodeURIComponent(raw));
  if (!ticker) notFound();

  const region = classifyTicker(ticker);
  const isCSE = region === "LK_CSE";

  let initial: Awaited<ReturnType<typeof quote>> | null = null;
  try {
    initial = await quote(ticker);
  } catch (err) {
    if (err instanceof TickerNotFoundError) notFound();
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
        <div className="flex items-center gap-2">
          <CreateAlertButton symbol={ticker} />
          <WatchlistToggle symbol={ticker} />
        </div>
      </div>

      <LivePriceHeader symbol={ticker} initial={initial} />

      {/* Perplexity Finance-style overview - key stats + company sidebar */}
      <CompanyOverview symbol={ticker} />

      {/* Historical chart - universal across exchanges */}
      <PriceChartSection symbol={ticker} exchange={initial?.exchange} height={600} />

      {isCSE ? (
        // CSE: cse.lk doesn't expose fundamentals or financials, so the
        // dashboard collapses to chart + AI placeholder + news.
        <>
          <ExchangeLimitedNotice
            exchange="CSE"
            sections={[
              "fundamentals",
              "income statement",
              "analyst consensus",
              "insider transactions",
            ]}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FeatureGate
                feature="ai_rating"
                title="AI analyst rating"
                description="Sign in to get a Gemini 2.5 Pro generated rating with confidence score, price target, bull/bear cases, and key risks."
              >
                <AIRating symbol={ticker} />
              </FeatureGate>
            </div>
            <div className="lg:col-span-1">
              <FeatureGate
                feature="news_feed"
                title="News & sentiment"
                description="Live headlines with sentiment classification."
              >
                <NewsFeed symbol={ticker} />
              </FeatureGate>
            </div>
          </div>
        </>
      ) : (
        <>
          <FeatureGate
            feature="fundamentals"
            variant="compact"
            title="Key metrics are part of the free signup"
            description="Sign in to unlock P/E, PEG, EV/EBITDA, margins, growth - all the institutional metrics."
          >
            <MetricsOverview symbol={ticker} />
          </FeatureGate>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FeatureGate
                feature="ai_rating"
                title="AI analyst rating"
                description="Sign in to get a Gemini 2.5 Pro generated rating with confidence score, price target, bull/bear cases, and key risks."
              >
                <AIRating symbol={ticker} />
              </FeatureGate>
            </div>
            <div>
              <AnalystPanel symbol={ticker} />
            </div>
          </div>

          <FeatureGate
            feature="financials"
            title="5-tab financial breakdown"
            description="Sign in to access valuation, income statement, balance sheet, cash flow, and growth - all annual + quarterly."
          >
            <FinancialsGrid symbol={ticker} />
          </FeatureGate>

          <FeatureGate
            feature="news_feed"
            title="News & sentiment feed"
            description="Sign in to see headlines from Finnhub + NewsAPI, tagged with sentiment for the last 14 days."
          >
            <NewsFeed symbol={ticker} />
          </FeatureGate>

          <FeatureGate
            feature="insider_feed"
            title="Insider transactions"
            description="Sign in to see Form 4 / 144 filings - executives buying or selling shares with $ value classification."
          >
            <InsiderFeed symbol={ticker} />
          </FeatureGate>
        </>
      )}

      <footer className="pb-2 pt-4 text-center text-[10px] text-muted-foreground">
        Market data may be delayed up to 15 minutes. AI ratings are informational, not financial
        advice.
      </footer>
    </div>
  );
}
