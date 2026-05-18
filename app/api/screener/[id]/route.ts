import { apiHandler } from "@/lib/api/handler";
import { ValidationFailedError } from "@/lib/market-data/errors";
import * as md from "@/lib/market-data";
import type { ScreenerId } from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: ReadonlySet<ScreenerId> = new Set<ScreenerId>([
  "day_gainers",
  "day_losers",
  "most_actives",
  "aggressive_small_caps",
  "growth_technology_stocks",
  "undervalued_large_caps",
  "top_mutual_funds",
]);

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  return apiHandler({ bucket: "screener", limit: 30 }, async () => {
    if (!ALLOWED.has(id as ScreenerId)) {
      throw new ValidationFailedError("Unknown screener id");
    }
    return md.screener(id as ScreenerId, 25);
  })(request);
}
