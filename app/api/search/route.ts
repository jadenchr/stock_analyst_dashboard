import { apiHandler, requiredQuery } from "@/lib/api/handler";
import { SearchQuerySchema } from "@/lib/utils/validators";
import { ValidationFailedError } from "@/lib/market-data/errors";
import * as md from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiHandler({ bucket: "search", limit: 30 }, async ({ url }) => {
  const raw = requiredQuery(url, "q");
  const parsed = SearchQuerySchema.safeParse(raw);
  if (!parsed.success) throw new ValidationFailedError("Invalid search query");
  return await md.search(parsed.data);
});
