import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { ValidationFailedError } from "@/lib/market-data/errors";
import { TickerSchema } from "@/lib/utils/validators";
import { getCurrentSession } from "@/lib/supabase/server";
import { createServerWriteClient } from "@/lib/supabase/server-write";
import * as md from "@/lib/market-data";
import { resolveTier, canAccess } from "@/lib/auth/entitlements";
import type {
  PortfolioHolding,
  PortfolioResponse,
  PortfolioTotals,
} from "@/lib/portfolio/types";
import type { PortfolioHoldingRow } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------------------------------------- shared auth helpers ------ */

async function requireProUser() {
  const { user, profile } = await getCurrentSession();
  if (!user) throw new ValidationFailedError("Not signed in");
  const tier = resolveTier(user, profile);
  if (!canAccess(tier, "portfolio")) {
    // Throw a typed error so apiHandler returns 403 with a clean body.
    const err = new Error("Portfolio is a Pro feature");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return user;
}

/* -------------------------------------------------- GET - list + P&L ---- */

export const GET = apiHandler({ bucket: "portfolio", limit: 60 }, async () => {
  const user = await requireProUser();
  const supabase = createServerWriteClient();
  const { data: rawRows, error } = await supabase
    .from("portfolio_holdings")
    .select("*")
    .eq("user_id", user.id)
    .order("purchase_date", { ascending: false });
  if (error) throw new Error(`Read failed: ${error.message}`);

  const rows = (rawRows ?? []) as PortfolioHoldingRow[];

  // Fetch live quotes in parallel, deduped by symbol so multiple lots of
  // the same security only cost one quote call.
  const uniqueSymbols = Array.from(new Set(rows.map((r) => r.symbol)));
  const quoteResults = await Promise.allSettled(uniqueSymbols.map((s) => md.quote(s)));
  const quoteMap = new Map<
    string,
    { price: number; previousClose: number; exchange: string; name: string }
  >();
  uniqueSymbols.forEach((sym, i) => {
    const r = quoteResults[i];
    if (r.status === "fulfilled") {
      quoteMap.set(sym, {
        price: r.value.price,
        previousClose: r.value.previousClose,
        exchange: r.value.exchange,
        name: r.value.name,
      });
    }
  });

  const stale: string[] = [];
  const holdings: PortfolioHolding[] = rows.map((row) => {
    const q = quoteMap.get(row.symbol);
    const shares = Number(row.shares);
    const costBasisPerShare = Number(row.cost_basis);
    const totalCostBasis = shares * costBasisPerShare;
    if (!q) {
      stale.push(row.symbol);
      return {
        id: row.id,
        symbol: row.symbol,
        shares,
        costBasis: costBasisPerShare,
        currency: row.currency,
        purchaseDate: row.purchase_date,
        notes: row.notes,
        currentPrice: null,
        exchange: null,
        name: null,
        marketValue: null,
        totalCostBasis,
        unrealizedPL: null,
        unrealizedPLPct: null,
        dayChange: null,
        dayChangePct: null,
      };
    }
    const marketValue = shares * q.price;
    const unrealizedPL = marketValue - totalCostBasis;
    const unrealizedPLPct = totalCostBasis > 0 ? (unrealizedPL / totalCostBasis) * 100 : 0;
    const dayChange = shares * (q.price - q.previousClose);
    const dayChangePct = q.previousClose > 0 ? ((q.price - q.previousClose) / q.previousClose) * 100 : 0;
    return {
      id: row.id,
      symbol: row.symbol,
      shares,
      costBasis: costBasisPerShare,
      currency: row.currency,
      purchaseDate: row.purchase_date,
      notes: row.notes,
      currentPrice: q.price,
      exchange: q.exchange,
      name: q.name,
      marketValue,
      totalCostBasis,
      unrealizedPL,
      unrealizedPLPct,
      dayChange,
      dayChangePct,
    };
  });

  // Aggregate per-currency. We don't FX-convert in v1.
  const totalsMap = new Map<string, PortfolioTotals>();
  for (const h of holdings) {
    if (h.marketValue == null) continue;
    const t = totalsMap.get(h.currency) ?? {
      currency: h.currency,
      marketValue: 0,
      costBasis: 0,
      unrealizedPL: 0,
      unrealizedPLPct: 0,
      dayChange: 0,
      dayChangePct: 0,
      holdingsCount: 0,
    };
    t.marketValue += h.marketValue;
    t.costBasis += h.totalCostBasis;
    t.unrealizedPL += h.unrealizedPL ?? 0;
    t.dayChange += h.dayChange ?? 0;
    t.holdingsCount += 1;
    totalsMap.set(h.currency, t);
  }
  const totals: PortfolioTotals[] = Array.from(totalsMap.values()).map((t) => ({
    ...t,
    unrealizedPLPct: t.costBasis > 0 ? (t.unrealizedPL / t.costBasis) * 100 : 0,
    // Day change % vs previous-close basis (cost basis isn't appropriate here)
    dayChangePct:
      t.marketValue - t.dayChange > 0 ? (t.dayChange / (t.marketValue - t.dayChange)) * 100 : 0,
  }));

  return {
    holdings,
    totals,
    stale,
  } satisfies PortfolioResponse;
});

/* -------------------------------------------------- POST - add lot ----- */

const HoldingBodySchema = z.object({
  symbol: TickerSchema,
  shares: z.coerce.number().positive().max(10_000_000),
  costBasis: z.coerce.number().nonnegative().max(10_000_000),
  currency: z.string().min(3).max(8).default("USD"),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "purchaseDate must be YYYY-MM-DD")
    .optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const POST = apiHandler({ bucket: "portfolio-write", limit: 30 }, async ({ request }) => {
  const user = await requireProUser();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationFailedError("Invalid JSON body");
  }
  const parsed = HoldingBodySchema.safeParse(body);
  if (!parsed.success) throw new ValidationFailedError("Invalid holding payload");

  const supabase = createServerWriteClient();
  const { data, error } = await supabase
    .from("portfolio_holdings")
    .insert({
      user_id: user.id,
      symbol: parsed.data.symbol,
      shares: parsed.data.shares,
      cost_basis: parsed.data.costBasis,
      currency: parsed.data.currency.toUpperCase(),
      purchase_date: parsed.data.purchaseDate,
      notes: parsed.data.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Insert failed: ${error.message}`);
  return data;
});
