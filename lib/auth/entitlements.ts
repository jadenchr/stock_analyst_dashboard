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

/**
 * NOTE: TEMPORARY all-access mode for end-to-end testing.
 * Every signed-in tier ("free", "pro", "max") gets every feature so the
 * dashboard owner can verify Portfolio, Alerts, Pro screeners, and CSE
 * advanced data without manually upgrading their Supabase tier.
 *
 * TO REVERT to the real entitlement matrix, restore the per-feature
 * lists below to:
 *
 *   ai_rating / fundamentals / financials / news_feed / insider_feed
 *   / watchlist_sync / screener_basic        -> ["free", "pro", "max"]
 *   screener_pro / cse_advanced / alerts / portfolio  -> ["pro", "max"]
 *
 * Guests still get nothing premium - the middleware redirects them to
 * /auth/signin before any of these checks run.
 */
const ALL_SIGNED_IN: ReadonlyArray<Tier> = ["free", "pro", "max"];
const MATRIX: Record<Feature, ReadonlyArray<Tier>> = {
  ai_rating: ALL_SIGNED_IN,
  fundamentals: ALL_SIGNED_IN,
  financials: ALL_SIGNED_IN,
  news_feed: ALL_SIGNED_IN,
  insider_feed: ALL_SIGNED_IN,
  watchlist_sync: ALL_SIGNED_IN,
  screener_basic: ALL_SIGNED_IN,
  screener_pro: ALL_SIGNED_IN,
  cse_advanced: ALL_SIGNED_IN,
  alerts: ALL_SIGNED_IN,
  portfolio: ALL_SIGNED_IN,
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
  max: "Max",
};
