import { apiHandler } from "@/lib/api/handler";
import * as md from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiHandler({ bucket: "movers", limit: 60 }, async () => {
  const [gainers, losers] = await Promise.allSettled([md.gainers(), md.losers()]);
  return {
    gainers: gainers.status === "fulfilled" ? gainers.value : [],
    losers: losers.status === "fulfilled" ? losers.value : [],
  };
});
