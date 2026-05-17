import { apiHandler, optionalQuery } from "@/lib/api/handler";
import { resolveTicker } from "@/lib/api/ticker-param";
import { ValidationFailedError } from "@/lib/market-data/errors";
import * as md from "@/lib/market-data";
import { HISTORICAL_RANGES, type HistoricalRange } from "@/lib/market-data/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ ticker: string }> };

function parseRange(input: string): HistoricalRange {
  const candidate = input.toUpperCase();
  if ((HISTORICAL_RANGES as readonly string[]).includes(candidate)) {
    return candidate as HistoricalRange;
  }
  throw new ValidationFailedError("Invalid range");
}

export async function GET(request: Request, { params }: Ctx) {
  const ticker = await resolveTicker(params);
  return apiHandler({ bucket: "historical", limit: 30 }, async ({ url }) => {
    const range = parseRange(optionalQuery(url, "range", "1Y"));
    return md.historical(ticker, range);
  })(request);
}
