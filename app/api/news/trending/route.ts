import { apiHandler, optionalQuery } from "@/lib/api/handler";
import * as md from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_COUNTRIES = new Set(["us", "gb", "in", "lk", "au", "ca"]);

export const GET = apiHandler({ bucket: "trending-news", limit: 30 }, async ({ url }) => {
  const raw = optionalQuery(url, "country", "us").toLowerCase();
  const country = ALLOWED_COUNTRIES.has(raw) ? raw : "us";
  return md.trendingBusinessNews(country);
});
