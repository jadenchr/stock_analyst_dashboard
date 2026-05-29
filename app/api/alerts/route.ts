import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { ValidationFailedError } from "@/lib/market-data/errors";
import { getCurrentSession } from "@/lib/supabase/server";
import { createServerWriteClient } from "@/lib/supabase/server-write";
import { safeTicker } from "@/lib/utils/validators";
import type { PriceAlertRow } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  symbol: z.string().min(1).max(32),
  direction: z.enum(["above", "below"]),
  targetPrice: z.coerce.number().positive().max(1_000_000_000),
  currency: z.string().min(3).max(8).default("USD"),
  note: z.string().max(280).optional(),
});

async function requireUser() {
  const { user } = await getCurrentSession();
  if (!user) throw new ValidationFailedError("Not signed in");
  return user;
}

/**
 * List the current user's price alerts (most recent first).
 */
export const GET = apiHandler({ bucket: "alerts-list", limit: 60 }, async () => {
  const user = await requireUser();
  const supabase = createServerWriteClient();
  const { data, error } = await supabase
    .from("price_alerts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Alerts fetch failed: ${error.message}`);
  return (data ?? []) as PriceAlertRow[];
});

/**
 * Create a new price alert.
 */
export const POST = apiHandler({ bucket: "alerts-write", limit: 30 }, async ({ request }) => {
  const user = await requireUser();
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationFailedError("Invalid JSON body");
  }
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) throw new ValidationFailedError("Invalid alert payload");

  const symbol = safeTicker(parsed.data.symbol.toUpperCase());
  if (!symbol) throw new ValidationFailedError("Invalid ticker");

  const supabase = createServerWriteClient();
  const { data, error } = await supabase
    .from("price_alerts")
    .insert({
      user_id: user.id,
      symbol,
      direction: parsed.data.direction,
      target_price: parsed.data.targetPrice,
      currency: parsed.data.currency.toUpperCase(),
      note: parsed.data.note ?? null,
      active: true,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Alert create failed: ${error.message}`);
  return data as PriceAlertRow;
});
