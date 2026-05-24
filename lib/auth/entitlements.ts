import type { User } from "@supabase/supabase-js";
import type { SubscriptionTier } from "@/lib/supabase/types";

/**
 * Centralized feature gating. The single source of truth for "can this
 * tier do X?" - both server-side helpers and client hooks consult this.
 *
 * Tiers:
 *   guest   - not signed in
 *   free    - signed in, default tier
 *   pro     - paid (manually upgraded for now; Stripe wires in 7b)
 */

export type Tier = "guest" | SubscriptionTier;

export type Feature =
  | "ai_rating"
  | "fundamentals"
  | "financials"
  | "news_feed"
  | "insider_feed"
  | "watchlist_sync"
  | "screener_basic"
  | "screener_pro"
  | "cse_advanced"
  | "alerts"
  | "portfolio";

const MATRIX: Record<Feature, ReadonlyArray<Tier>> = {
  // Guest-visible: nothing premium.
  // Free unlocks the core dashboard.
  ai_rating: ["free", "pro"],
  fundamentals: ["free", "pro"],
  financials: ["free", "pro"],
  news_feed: ["free", "pro"],
  insider_feed: ["free", "pro"],
  watchlist_sync: ["free", "pro"],
  screener_basic: ["free", "pro"],
  // Pro-only:
  screener_pro: ["pro"],
  cse_advanced: ["pro"],
  alerts: ["pro"],
  portfolio: ["pro"],
};

export function canAccess(tier: Tier, feature: Feature): boolean {
  return MATRIX[feature].includes(tier);
}

/**
 * Resolve a user's tier from auth + profile.
 *
 * Critically: a signed-in user with NO profile row yet is still treated
 * as `free` (not `guest`). This covers:
 *   • The brief window between OAuth signin and the on-signup trigger
 *     inserting the profile row.
 *   • Users who signed up before the schema was deployed (no row exists).
 *   • Any transient RLS / network blip that fails the profile fetch.
 */
export function resolveTier(
  user: User | null,
  profile: { subscription_tier?: SubscriptionTier | null } | null,
): Tier {
  if (!user) return "guest";
  return profile?.subscription_tier ?? "free";
}

/**
 * @deprecated Prefer `resolveTier(user, profile)` so a signed-in user
 * without a profile row doesn't get locked out as `guest`. Kept as a
 * thin shim for any pre-existing call sites that don't have `user`.
 */
export function tierFromProfile(
  profile: { subscription_tier?: SubscriptionTier | null } | null,
): Tier {
  if (!profile) return "guest";
  return profile.subscription_tier ?? "free";
}

export const TIER_LABEL: Record<Tier, string> = {
  guest: "Guest",
  free: "Free",
  pro: "Pro",
};
