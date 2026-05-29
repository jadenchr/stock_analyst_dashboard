import { apiHandler } from "@/lib/api/handler";
import { ValidationFailedError } from "@/lib/market-data/errors";
import { getCurrentSession } from "@/lib/supabase/server";
import { createServerWriteClient } from "@/lib/supabase/server-write";
import type { NotificationRow } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * List the user's notifications (newest first). Capped at 50 so the
 * bell stays fast - we don't expose pagination yet.
 */
export const GET = apiHandler({ bucket: "notifications-list", limit: 60 }, async () => {
  const { user } = await getCurrentSession();
  if (!user) throw new ValidationFailedError("Not signed in");
  const supabase = createServerWriteClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Notifications fetch failed: ${error.message}`);
  const rows = (data ?? []) as NotificationRow[];
  return {
    items: rows,
    unread: rows.filter((r) => !r.read_at).length,
  };
});

/**
 * Mark all of the user's notifications as read.
 */
export const PATCH = apiHandler({ bucket: "notifications-write", limit: 60 }, async () => {
  const { user } = await getCurrentSession();
  if (!user) throw new ValidationFailedError("Not signed in");
  const supabase = createServerWriteClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) throw new Error(`Mark-read failed: ${error.message}`);
  return { ok: true };
});
