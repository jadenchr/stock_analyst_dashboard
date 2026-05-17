import { apiHandler } from "@/lib/api/handler";
import { resolveTicker } from "@/lib/api/ticker-param";
import * as md from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ ticker: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const ticker = await resolveTicker(params);
  return apiHandler({ bucket: "news", limit: 30 }, async () => {
    // Best-effort: enrich the fallback keyword search with the company name
    let companyName: string | undefined;
    try {
      const q = await md.quote(ticker);
      companyName = q.name;
    } catch {
      // ignore — news fallback can still work with bare symbol
    }
    return md.news(ticker, companyName);
  })(request);
}
