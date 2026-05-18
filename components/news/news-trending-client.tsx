"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ExternalLink, Filter, Loader2, Newspaper } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/app/providers";
import type { NewsArticle } from "@/lib/market-data/types";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/utils/format";
import { SkeletonBlock } from "@/components/ui/skeleton-block";

type Tone = "positive" | "neutral" | "negative";

const TONE_STYLES: Record<Tone, { dot: string; pill: string; border: string }> = {
  positive: {
    dot: "bg-bull",
    pill: "border-bull/30 bg-bull/10 text-bull",
    border: "border-l-bull/70",
  },
  neutral: {
    dot: "bg-muted-foreground",
    pill: "border-border/60 bg-card/60 text-muted-foreground",
    border: "border-l-border",
  },
  negative: {
    dot: "bg-bear",
    pill: "border-bear/30 bg-bear/10 text-bear",
    border: "border-l-bear/70",
  },
};

const COUNTRY_OPTIONS: { value: string; label: string; flag: string }[] = [
  { value: "us", label: "United States", flag: "🇺🇸" },
  { value: "gb", label: "United Kingdom", flag: "🇬🇧" },
  { value: "in", label: "India", flag: "🇮🇳" },
  { value: "au", label: "Australia", flag: "🇦🇺" },
  { value: "ca", label: "Canada", flag: "🇨🇦" },
];

export function NewsTrendingClient() {
  const [country, setCountry] = useState("us");
  const [sentimentFilter, setSentimentFilter] = useState<Tone | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["news-trending", country] as const,
    queryFn: ({ signal }) =>
      apiGet<NewsArticle[]>(`/api/news/trending?country=${country}`, { signal }),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  const articles = data ?? [];

  // Build the source filter list dynamically from the response
  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const a of articles) set.add(a.source);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [articles]);

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (sentimentFilter !== "all" && (a.sentiment ?? "neutral") !== sentimentFilter) return false;
      if (sourceFilter !== "all" && a.source !== sourceFilter) return false;
      return true;
    });
  }, [articles, sentimentFilter, sourceFilter]);

  return (
    <div className="flex flex-col gap-5">
      {/* Filters bar */}
      <div className="glass flex flex-wrap items-center gap-3 rounded-xl p-3">
        <span className="inline-flex items-center gap-1.5 pl-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Filter className="h-3 w-3" aria-hidden />
          Filter
        </span>

        {/* Country */}
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="cursor-pointer rounded-lg border border-border/70 bg-card/60 px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-card"
          aria-label="Country"
        >
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.flag} {c.label}
            </option>
          ))}
        </select>

        {/* Sentiment */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border/70 bg-card/60 p-0.5">
          {(["all", "positive", "neutral", "negative"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSentimentFilter(s)}
              className={cn(
                "cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium capitalize transition-colors duration-150",
                sentimentFilter === s
                  ? s === "positive"
                    ? "bg-bull/15 text-bull"
                    : s === "negative"
                      ? "bg-bear/15 text-bear"
                      : "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={sentimentFilter === s}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Source */}
        {sources.length > 0 && (
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="max-w-[180px] cursor-pointer rounded-lg border border-border/70 bg-card/60 px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-card"
            aria-label="Source"
          >
            <option value="all">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
          {isFetching ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              updating…
            </>
          ) : (
            `${filtered.length} of ${articles.length} stories`
          )}
        </div>
      </div>

      {/* Body */}
      {isLoading && articles.length === 0 ? (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <li key={i} className="glass flex flex-col gap-3 rounded-xl p-4">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-3/4" />
              <SkeletonBlock className="h-3 w-24" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <div className="glass flex flex-col items-center gap-3 rounded-xl px-6 py-12 text-center">
          <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
          <p className="text-sm text-foreground">News feed is temporarily unavailable.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="cursor-pointer rounded-lg border border-border/70 bg-card/60 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-card"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 rounded-xl px-6 py-12 text-center">
          <Newspaper className="h-5 w-5 text-muted-foreground" aria-hidden />
          <p className="text-sm text-foreground">No stories match those filters.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a, i) => (
            <ArticleCard key={a.id} article={a} index={i} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ArticleCard({ article, index }: { article: NewsArticle; index: number }) {
  const tone: Tone = article.sentiment ?? "neutral";
  const styles = TONE_STYLES[tone];

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.025, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={cn(
          "glass group flex h-full cursor-pointer flex-col gap-3 rounded-xl border-l-2 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated",
          styles.border,
        )}
      >
        {article.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.imageUrl}
            alt=""
            className="aspect-[2/1] w-full rounded-md object-cover opacity-80 transition-opacity group-hover:opacity-100"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        )}
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="truncate font-medium text-foreground/80">{article.source}</span>
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
        <div className="mt-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <ExternalLink className="h-3 w-3" aria-hidden />
          Read on {article.source}
        </div>
      </a>
    </motion.li>
  );
}
