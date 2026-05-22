import { apiHandler } from "@/lib/api/handler";
import * as md from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Region = "US" | "IN_NSE" | "IN_BSE" | "LK_CSE" | "CRYPTO";

function parseRegion(raw: string | null): Region {
  if (raw === "IN_NSE" || raw === "IN_BSE" || raw === "LK_CSE" || raw === "CRYPTO") {
    return raw;
  }
  return "US";
}

export const GET = apiHandler({ bucket: "sectors", limit: 60 }, async ({ url }) => {
  const region = parseRegion(url.searchParams.get("region"));
  return md.regionalHeatmap(region);
});
