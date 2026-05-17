import { apiHandler } from "@/lib/api/handler";
import * as md from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Curated regional blue-chips. Yahoo serves Indian quotes; CSE comes from
// the CSE adapter inside `md.quotes`.
const INDIA = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "HINDUNILVR.NS"];
const SRI_LANKA = [
  "JKH.N0000",
  "COMB.N0000",
  "HNB.N0000",
  "SAMP.N0000",
  "DIAL.N0000",
  "LOLC.N0000",
];

export const GET = apiHandler({ bucket: "regional", limit: 30 }, async () => {
  const [india, sriLanka] = await Promise.all([md.quotes(INDIA), md.quotes(SRI_LANKA)]);
  return { india, sriLanka };
});
