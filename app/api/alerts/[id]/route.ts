import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { ValidationFailedError } from "@/lib/market-data/errors";
import { getCurrentSession } from "@/lib/supabase/server";
import { createServerWriteClient } from "@/lib/supabase/server-write";
import type { PriceAlertRow } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PatchSchema = z.object({
  active: z.boolean().optional(),
  targetPrice: z.coerce.number().positive().max(1_000_000_000).optional(),
  direction: z.enum(["above", "below"]).optional(),
  note: z.string().max(280).nullable().optional(),
  /** Set to true to clear `triggered_at` and let the alert fire again. */
  reset: z.boolean().optional(),
});

function idFromUrl(url: URL): string {
  const id = url.pathname.split("/").pop() ?? "";
  if (!UUID_RE.test(id)) throw new ValidationFailedError("Invalid alert id");
  return id;
}

async function requireUser() {
  const { user } = await getCurrentSession();
  if (!user) throw new ValidationFailedError("Not signed in");
  return user;
}

export const PATCH = apiHandler({ bucket: "alerts-write", limit: 60 }, async ({ request, url }) => {
  const user = await requireUser();
  const id = idFromUrl(url);
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationFailedError("Invalid JSON body");
  }
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) throw new ValidationFailedError("Invalid update payload");

  const patch: Record<string, unknown> = {};
  if (parsed.data.active != null) patch.active = parsed.data.active;
  if (parsed.data.targetPrice != null) patch.target_price = parsed.data.targetPrice;
  if (parsed.data.direction) patch.direction = parsed.data.direction;
  if (parsed.data.note !== undefined) patch.note = parsed.data.note;
  if (parsed.data.reset) {
    patch.triggered_at = null;
    patch.active = true;
  }
  if (Object.keys(patch).length === 0) throw new ValidationFailedError("Nothing to update");

  const supabase = createServerWriteClient();
  const { data, error } = await supabase
    .from("price_alerts")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) throw new Error(`Alert update failed: ${error.message}`);
  return data as PriceAlertRow;
});

export const DELETE = apiHandler({ bucket: "alerts-write", limit: 60 }, async ({ url }) => {
  const user = await requireUser();
  const id = idFromUrl(url);
  const supabase = createServerWriteClient();
  const { error } = await supabase
    .from("price_alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(`Alert delete failed: ${error.message}`);
  return { ok: true };
});
