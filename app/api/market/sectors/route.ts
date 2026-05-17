import { apiHandler } from "@/lib/api/handler";
import * as md from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiHandler({ bucket: "sectors", limit: 60 }, async () => {
  return md.sectorPerformance();
});
