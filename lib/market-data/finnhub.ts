import "server-only";
import { z } from "zod";
import { safeFetch } from "@/lib/security/allowlist";
import { sanitizeText, sanitizeUrl } from "@/lib/security/sanitize";
import { ProviderError } from "./errors";
import { classifySentiment } from "./sentiment";
import type { AnalystConsensus, InsiderTx, NewsArticle } from "./types";

const PROVIDER = "finnhub";
const BASE = "https://finnhub.io/api/v1";

function getKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new ProviderError(PROVIDER, "FINNHUB_API_KEY is not set", 503);
  return key;
}

async function finnhubFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("token", getKey());
  const res = await safeFetch(url, { timeoutMs: 10_000 });
  if (res.status === 429) throw new ProviderError(PROVIDER, "Rate limited by Finnhub", 429);
  if (!res.ok) throw new ProviderError(PROVIDER, `HTTP ${res.status}`, 502);
  return (await res.json()) as T;
}

/* --------------------------------------------------------------- news --- */

const FinnhubNewsItemSchema = z.object({
  id: z.union([z.number(), z.string()]),
  category: z.string().optional(),
  datetime: z.number(), // unix seconds
  headline: z.string(),
  image: z.string().optional(),
  related: z.string().optional(),
  source: z.string(),
  summary: z.string().optional(),
  url: z.string(),
});

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getCompanyNews(symbol: string): Promise<NewsArticle[]> {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 14);

  const raw = await finnhubFetch<unknown>("/company-news", {
    symbol,
    from: formatDate(from),
    to: formatDate(to),
  });

  if (!Array.isArray(raw)) return [];

  return raw
    .map<NewsArticle | null>((item) => {
      const parsed = FinnhubNewsItemSchema.safeParse(item);
      if (!parsed.success) return null;
      const url = sanitizeUrl(parsed.data.url);
      if (!url) return null;
      const headline = sanitizeText(parsed.data.headline, 240);
      if (!headline) return null;
      const summary = parsed.data.summary ? sanitizeText(parsed.data.summary, 480) : null;
      return {
        id: String(parsed.data.id),
        headline,
        summary,
        url,
        source: sanitizeText(parsed.data.source, 80),
        imageUrl: parsed.data.image ? sanitizeUrl(parsed.data.image) : null,
        publishedAt: new Date(parsed.data.datetime * 1000).toISOString(),
        sentiment: classifySentiment(headline, summary),
      };
    })
    .filter((n): n is NewsArticle => n !== null)
    .slice(0, 15);
}

/* ----------------------------------------------------- insider transactions */

const InsiderSchema = z.object({
  data: z
    .array(
      z.object({
        name: z.string(),
        share: z.number().optional(),
        change: z.number().optional(),
        transactionPrice: z.number().optional(),
        transactionDate: z.string(),
        transactionCode: z.string().optional(),
      }),
    )
    .optional(),
});

export async function getInsiderTx(symbol: string): Promise<InsiderTx[]> {
  const raw = await finnhubFetch<unknown>("/stock/insider-transactions", { symbol });
  const parsed = InsiderSchema.safeParse(raw);
  if (!parsed.success) return [];
  const rows = parsed.data.data ?? [];

  return rows
    .map<InsiderTx | null>((r) => {
      const shares = r.change ?? r.share ?? null;
      // Code P = open-market purchase, S = sale, others bucketed
      const code = (r.transactionCode ?? "").toUpperCase();
      const transaction: InsiderTx["transaction"] =
        code.startsWith("P") || (shares != null && shares > 0)
          ? "buy"
          : code.startsWith("S") || (shares != null && shares < 0)
            ? "sell"
            : "other";
      const price = r.transactionPrice ?? null;
      return {
        name: sanitizeText(r.name, 120),
        role: null,
        transaction,
        shares: shares == null ? null : Math.abs(shares),
        price,
        value: shares != null && price != null ? Math.abs(shares) * price : null,
        date: r.transactionDate,
      };
    })
    .filter((r): r is InsiderTx => r !== null)
    .slice(0, 25);
}

/* ----------------------------------------------------- analyst consensus -- */

const RecommendationSchema = z.array(
  z.object({
    period: z.string(),
    buy: z.number(),
    hold: z.number(),
    sell: z.number(),
    strongBuy: z.number(),
    strongSell: z.number(),
    symbol: z.string(),
  }),
);

export async function getRecommendations(symbol: string): Promise<AnalystConsensus | null> {
  const raw = await finnhubFetch<unknown>("/stock/recommendation", { symbol });
  const parsed = RecommendationSchema.safeParse(raw);
  if (!parsed.success || parsed.data.length === 0) return null;
  // Most recent month is index 0 in Finnhub's response.
  const latest = parsed.data[0];
  return {
    symbol,
    asOf: latest.period,
    strongBuy: latest.strongBuy,
    buy: latest.buy,
    hold: latest.hold,
    sell: latest.sell,
    strongSell: latest.strongSell,
  };
}
