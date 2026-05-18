import type { SubscriptionTier } from "@/lib/supabase/types";

/**
 * Centralized feature gating. The single source of truth for "can this
 * tier do X?" — both server-side helpers and client hooks consult this.
 *
 * Tiers:
 *   guest   — not signed in
 *   free    — signed in, default tier
 *   pro     — paid (manually upgraded for now; Stripe wires in 7b)
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
  | "alerts";

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
};

export function canAccess(tier: Tier, feature: Feature): boolean {
  return MATRIX[feature].includes(tier);
}

export function tierFromProfile(profile: { subscription_tier?: SubscriptionTier } | null): Tier {
  if (!profile) return "guest";
  return profile.subscription_tier ?? "free";
}

export const TIER_LABEL: Record<Tier, string> = {
  guest: "Guest",
  free: "Free",
  pro: "Pro",
};
