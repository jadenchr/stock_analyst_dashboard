import { apiHandler } from "@/lib/api/handler";
import { resolveTicker } from "@/lib/api/ticker-param";
import * as md from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ ticker: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const ticker = await resolveTicker(params);
  return apiHandler({ bucket: "insider", limit: 20 }, async () => md.insiderTx(ticker))(request);
}
