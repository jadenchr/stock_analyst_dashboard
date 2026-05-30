import { describe, it, expect } from "vitest";
import { canAccess, resolveTier, TIER_LABEL } from "@/lib/auth/entitlements";

describe("entitlements", () => {
  it("guest gets nothing premium", () => {
    expect(canAccess("guest", "ai_rating")).toBe(false);
    expect(canAccess("guest", "fundamentals")).toBe(false);
    expect(canAccess("guest", "alerts")).toBe(false);
    expect(canAccess("guest", "portfolio")).toBe(false);
  });

  it("free unlocks the core dashboard", () => {
    expect(canAccess("free", "ai_rating")).toBe(true);
    expect(canAccess("free", "financials")).toBe(true);
    expect(canAccess("free", "news_feed")).toBe(true);
    expect(canAccess("free", "insider_feed")).toBe(true);
    expect(canAccess("free", "watchlist_sync")).toBe(true);

    // NOTE: while the temporary all-access mode is on (see comment in
    // lib/auth/entitlements.ts), free also reaches the Pro-only
    // features. When that revert ships, flip these back to .toBe(false).
    expect(canAccess("free", "alerts")).toBe(true);
    expect(canAccess("free", "portfolio")).toBe(true);
    expect(canAccess("free", "screener_pro")).toBe(true);
  });

  it("pro unlocks pro features", () => {
    expect(canAccess("pro", "alerts")).toBe(true);
    expect(canAccess("pro", "portfolio")).toBe(true);
    expect(canAccess("pro", "screener_pro")).toBe(true);
    expect(canAccess("pro", "cse_advanced")).toBe(true);
  });

  it("max unlocks everything pro can do", () => {
    expect(canAccess("max", "alerts")).toBe(true);
    expect(canAccess("max", "portfolio")).toBe(true);
    expect(canAccess("max", "screener_pro")).toBe(true);
    expect(canAccess("max", "cse_advanced")).toBe(true);
    expect(canAccess("max", "ai_rating")).toBe(true);
  });

  it("resolveTier handles all three signed-in shapes", () => {
    const user = { id: "u1" } as never;
    expect(resolveTier(null, null)).toBe("guest");
    expect(resolveTier(user, null)).toBe("free");
    expect(resolveTier(user, { subscription_tier: "free" })).toBe("free");
    expect(resolveTier(user, { subscription_tier: "pro" })).toBe("pro");
    expect(resolveTier(user, { subscription_tier: "max" })).toBe("max");
  });

  it("tier labels cover all tiers", () => {
    expect(TIER_LABEL.guest).toBe("Guest");
    expect(TIER_LABEL.free).toBe("Free");
    expect(TIER_LABEL.pro).toBe("Pro");
    expect(TIER_LABEL.max).toBe("Max");
  });
});
