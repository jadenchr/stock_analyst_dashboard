import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { ValidationFailedError } from "@/lib/market-data/errors";
import { getCurrentSession } from "@/lib/supabase/server";
import { createServerWriteClient } from "@/lib/supabase/server-write";
import { resolveTier, canAccess } from "@/lib/auth/entitlements";
import { mapRows, parseCsv } from "@/lib/portfolio/csv";
import type { PortfolioImportPreviewRow, PortfolioImportResult } from "@/lib/portfolio/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CSV_BYTES = 256 * 1024; // 256KB — plenty for thousands of lots
const MAX_ROWS = 1_000;

const BodySchema = z.object({
  /** Preview-only: return parsed rows without inserting. */
  preview: z.boolean().default(false),
  /** Raw CSV text. */
  csv: z.string().min(1).max(MAX_CSV_BYTES),
  /**
   * Optional default currency to fill in when the CSV doesn't carry one.
   * The data layer requires a currency on every lot. Defaults to USD.
   */
  defaultCurrency: z.string().min(3).max(8).default("USD"),
});

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

export const POST = apiHandler(
  { bucket: "portfolio-import", limit: 10 },
  async ({ request }) => {
    const user = await requireProUser();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationFailedError("Invalid JSON body");
    }
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) throw new ValidationFailedError("Invalid import payload");

    const tokens = parseCsv(parsed.data.csv);
    if (tokens.length === 0) {
      return { rows: [], inserted: 0, skipped: 0, errors: [] };
    }
    if (tokens.length - 1 > MAX_ROWS) {
      throw new ValidationFailedError(`Too many rows (max ${MAX_ROWS})`);
    }

    const previewRows: PortfolioImportPreviewRow[] = mapRows(tokens);

    // Preview mode — return parsed rows without inserting
    if (parsed.data.preview) {
      return {
        rows: previewRows,
        inserted: 0,
        skipped: previewRows.filter((r) => !r.valid).length,
        errors: [],
      };
    }

    // Commit — insert valid rows in one batch
    const validRows = previewRows.filter((r) => r.valid);
    const skipped = previewRows.length - validRows.length;
    if (validRows.length === 0) {
      const result: PortfolioImportResult = {
        inserted: 0,
        skipped,
        errors: previewRows
          .filter((r) => !r.valid)
          .slice(0, 50)
          .map((r) => ({ rowIndex: r.rowIndex, reason: r.errors.join("; ") })),
      };
      return { rows: previewRows, ...result };
    }

    const payload = validRows.map((r) => ({
      user_id: user.id,
      symbol: r.symbol!,
      shares: r.shares!,
      cost_basis: r.costBasis!,
      currency: parsed.data.defaultCurrency.toUpperCase(),
      purchase_date: r.purchaseDate ?? new Date().toISOString().slice(0, 10),
      notes: r.notes,
    }));

    const supabase = createServerWriteClient();
    const { error } = await supabase.from("portfolio_holdings").insert(payload);
    if (error) throw new Error(`Bulk insert failed: ${error.message}`);

    const result: PortfolioImportResult = {
      inserted: validRows.length,
      skipped,
      errors: previewRows
        .filter((r) => !r.valid)
        .slice(0, 50)
        .map((r) => ({ rowIndex: r.rowIndex, reason: r.errors.join("; ") })),
    };
    return { rows: previewRows, ...result };
  },
);
