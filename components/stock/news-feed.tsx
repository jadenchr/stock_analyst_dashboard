"use client";

import { motion } from "framer-motion";
import { AlertCircle, ExternalLink, Newspaper } from "lucide-react";
import { useNews } from "@/lib/api/client";
import type { NewsArticle } from "@/lib/market-data/types";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/utils/format";
import { SkeletonBlock } from "@/components/ui/skeleton-block";

interface Props {
  symbol: string;
}

type Tone = "positive" | "neutral" | "negative";

const TONE_STYLES: Record<Tone, { dot: string; text: string; border: string; pill: string }> = {
  positive: {
    dot: "bg-bull",
    text: "text-bull",
    border: "border-l-bull/70",
    pill: "border-bull/30 bg-bull/10 text-bull",
  },
  neutral: {
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    border: "border-l-border",
    pill: "border-border/60 bg-card/60 text-muted-foreground",
  },
  negative: {
    dot: "bg-bear",
    text: "text-bear",
    border: "border-l-bear/70",
    pill: "border-bear/30 bg-bear/10 text-bear",
  },
};

export function NewsFeed({ symbol }: Props) {
  const { data, isLoading, isError } = useNews(symbol);
  const articles = data ?? [];

  return (
    <section aria-label="News and sentiment" className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-tight text-foreground">News & sentiment</h2>
          <p className="text-xs text-muted-foreground">
            Last 14 days · Finnhub primary, NewsAPI fallback · sentiment by lexical classifier
          </p>
        </div>
      </div>

      {/* Aggregate sentiment meter */}
      {articles.length > 0 && <SentimentMeter articles={articles} />}

      {/* Article list */}
      {isLoading && articles.length === 0 ? (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="glass flex flex-col gap-3 rounded-xl p-4">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-3/4" />
              <SkeletonBlock className="h-3 w-24" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <div className="glass flex items-center gap-3 rounded-xl px-4 py-3 text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4 text-destructive" aria-hidden />
          News feed is temporarily unavailable.
        </div>
      ) : articles.length === 0 ? (
        <div className="glass flex items-center gap-3 rounded-xl px-4 py-3 text-xs text-muted-foreground">
          <Newspaper className="h-4 w-4" aria-hidden />
          No recent headlines for this ticker.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {articles.map((a, i) => (
            <ArticleCard key={a.id} article={a} index={i} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ArticleCard({ article, index }: { article: NewsArticle; index: number }) {
  const tone: Tone = article.sentiment ?? "neutral";
  const styles = TONE_STYLES[tone];

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={cn(
          "glass group flex h-full gap-3 rounded-xl border-l-2 p-4 transition-all hover:scale-[1.01] hover:shadow-elevated",
          styles.border,
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="font-medium text-foreground/80">{article.source}</span>
            <span aria-hidden>·</span>
            <span>{formatTimeAgo(article.publishedAt)}</span>
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold",
                styles.pill,
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
              {tone}
            </span>
          </div>
          <h3 className="line-clamp-3 text-sm font-medium leading-snug text-foreground group-hover:text-primary">
            {article.headline}
          </h3>
          {article.summary && (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {article.summary}
            </p>
          )}
        </div>
        <ExternalLink
          className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
          aria-hidden
        />
      </a>
    </motion.li>
  );
}

function SentimentMeter({ articles }: { articles: NewsArticle[] }) {
  const counts = articles.reduce(
    (acc, a) => {
      const t = (a.sentiment ?? "neutral") as Tone;
      acc[t] += 1;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 },
  );
  const total = articles.length;
  const positivePct = (counts.positive / total) * 100;
  const neutralPct = (counts.neutral / total) * 100;
  const negativePct = (counts.negative / total) * 100;

  // Composite score: positive contributes +1, negative -1, neutral 0
  const composite = total > 0 ? ((counts.positive - counts.negative) / total) * 100 : 0;
  const compositeRounded = Math.round(composite);
  const compositeTone: Tone = composite > 10 ? "positive" : composite < -10 ? "negative" : "neutral";

  return (
    <div className="glass flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex shrink-0 items-baseline gap-2">
        <span
          className={cn(
            "font-display text-3xl tabular-nums",
            TONE_STYLES[compositeTone].text,
          )}
        >
          {compositeRounded > 0 ? "+" : ""}
          {compositeRounded}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          7-day sentiment
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${positivePct}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="h-full bg-bull/80"
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${neutralPct}%` }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="h-full bg-muted-foreground/40"
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${negativePct}%` }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="h-full bg-bear/80"
          />
        </motion.div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-bull/80" />
            Positive {counts.positive}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-muted-foreground/40" />
            Neutral {counts.neutral}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-bear/80" />
            Negative {counts.negative}
          </span>
        </div>
      </div>
    </div>
  );
}
