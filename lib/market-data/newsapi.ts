import "server-only";
import { z } from "zod";
import { safeFetch } from "@/lib/security/allowlist";
import { sanitizeText, sanitizeUrl } from "@/lib/security/sanitize";
import { ProviderError } from "./errors";
import { classifySentiment } from "./sentiment";
import type { NewsArticle } from "./types";

const PROVIDER = "newsapi";
const BASE = "https://newsapi.org/v2/everything";

function getKey(): string {
  const key = process.env.NEWS_API_KEY;
  if (!key) throw new ProviderError(PROVIDER, "NEWS_API_KEY is not set", 503);
  return key;
}

const NewsApiResponseSchema = z.object({
  status: z.string(),
  totalResults: z.number().optional(),
  articles: z
    .array(
      z.object({
        source: z.object({ name: z.string() }).passthrough(),
        author: z.string().nullable().optional(),
        title: z.string(),
        description: z.string().nullable().optional(),
        url: z.string(),
        urlToImage: z.string().nullable().optional(),
        publishedAt: z.string(),
      }),
    )
    .optional(),
});

export async function searchNews(query: string, max = 12): Promise<NewsArticle[]> {
  const url = new URL(BASE);
  url.searchParams.set("q", query);
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", String(Math.min(max, 25)));

  // NewsAPI prefers Authorization header over query-string apikey
  const res = await safeFetch(url, {
    headers: { "X-Api-Key": getKey() },
    timeoutMs: 10_000,
  });
  if (res.status === 401 || res.status === 403) {
    throw new ProviderError(PROVIDER, "Unauthorized", 503);
  }
  if (res.status === 429) throw new ProviderError(PROVIDER, "Rate limited", 429);
  if (!res.ok) throw new ProviderError(PROVIDER, `HTTP ${res.status}`, 502);

  const json: unknown = await res.json();
  const parsed = NewsApiResponseSchema.safeParse(json);
  if (!parsed.success || parsed.data.status !== "ok") return [];

  return (parsed.data.articles ?? [])
    .map<NewsArticle | null>((a, i) => {
      const safeUrl = sanitizeUrl(a.url);
      if (!safeUrl) return null;
      const headline = sanitizeText(a.title, 240);
      if (!headline) return null;
      const summary = a.description ? sanitizeText(a.description, 480) : null;
      return {
        id: `${a.publishedAt}-${i}`,
        headline,
        summary,
        url: safeUrl,
        source: sanitizeText(a.source?.name, 80) || "Unknown",
        imageUrl: a.urlToImage ? sanitizeUrl(a.urlToImage) : null,
        publishedAt: a.publishedAt,
        sentiment: classifySentiment(headline, summary),
      };
    })
    .filter((n): n is NewsArticle => n !== null);
}
