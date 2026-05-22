import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { ValidationFailedError } from "@/lib/market-data/errors";
import { TickerSchema } from "@/lib/utils/validators";
import { getCurrentSession } from "@/lib/supabase/server";
import { createServerWriteClient } from "@/lib/supabase/server-write";
import { resolveTier, canAccess } from "@/lib/auth/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireProUser() {
  const { user, profile } = await getCurrentSession();
  if (!user) throw new ValidationFailedError("Not signed in");
  const tier = resolveTier(user, profile);
  if (!canAccess(tier, "portfolio")) {
    const err = new Error("Portfolio is a Pro feature");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return user;
}

const UpdateBodySchema = z.object({
  symbol: TickerSchema.optional(),
  shares: z.coerce.number().positive().max(10_000_000).optional(),
  costBasis: z.coerce.number().nonnegative().max(10_000_000).optional(),
  currency: z.string().min(3).max(8).optional(),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "purchaseDate must be YYYY-MM-DD")
    .optional(),
  notes: z.string().max(500).optional().nullable(),
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  return apiHandler(
    { bucket: "portfolio-write", limit: 30 },
    async ({ request: req }) => {
      if (!UUID_REGEX.test(id)) throw new ValidationFailedError("Invalid id");
      const user = await requireProUser();

      let body: unknown;
      try {
        body = await req.json();
      } catch {
        throw new ValidationFailedError("Invalid JSON body");
      }
      const parsed = UpdateBodySchema.safeParse(body);
      if (!parsed.success) throw new ValidationFailedError("Invalid update payload");

      const payload: Record<string, unknown> = {};
      if (parsed.data.symbol != null) payload.symbol = parsed.data.symbol;
      if (parsed.data.shares != null) payload.shares = parsed.data.shares;
      if (parsed.data.costBasis != null) payload.cost_basis = parsed.data.costBasis;
      if (parsed.data.currency != null) payload.currency = parsed.data.currency.toUpperCase();
      if (parsed.data.purchaseDate != null) payload.purchase_date = parsed.data.purchaseDate;
      if (parsed.data.notes !== undefined) payload.notes = parsed.data.notes;

      if (Object.keys(payload).length === 0) {
        throw new ValidationFailedError("No fields to update");
      }

      const supabase = createServerWriteClient();
      const { data, error } = await supabase
        .from("portfolio_holdings")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("*")
        .single();
      if (error) throw new Error(`Update failed: ${error.message}`);
      return data;
    },
  )(request);
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params;
  return apiHandler(
    { bucket: "portfolio-write", limit: 30 },
    async () => {
      if (!UUID_REGEX.test(id)) throw new ValidationFailedError("Invalid id");
      const user = await requireProUser();
      const supabase = createServerWriteClient();
      const { error } = await supabase
        .from("portfolio_holdings")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw new Error(`Delete failed: ${error.message}`);
      return { deleted: true };
    },
  )(request);
}
