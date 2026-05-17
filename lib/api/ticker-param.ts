import "server-only";
import { ValidationFailedError } from "@/lib/market-data/errors";
import { TickerSchema } from "@/lib/utils/validators";

/**
 * Resolve and validate the [ticker] dynamic segment. Throws a typed
 * ValidationFailedError so apiHandler can map to 400.
 */
export async function resolveTicker(
  params: Promise<{ ticker: string }>,
): Promise<string> {
  const { ticker } = await params;
  const decoded = decodeURIComponent(ticker);
  const parsed = TickerSchema.safeParse(decoded);
  if (!parsed.success) throw new ValidationFailedError("Invalid ticker symbol");
  return parsed.data;
}
