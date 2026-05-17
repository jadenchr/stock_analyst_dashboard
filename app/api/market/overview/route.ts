import { apiHandler } from "@/lib/api/handler";
import * as md from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POPULAR = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA"];

export const GET = apiHandler({ bucket: "market-overview", limit: 60 }, async () => {
  const [indices, popularQuotes] = await Promise.all([
    md.marketIndices(),
    md.quotes(POPULAR),
  ]);
  return { indices, popular: popularQuotes };
});
