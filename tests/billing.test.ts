import { describe, it, expect } from "vitest";
import {
  isStripeConfigured,
  priceIdFor,
  tierFromPriceId,
  verifyWebhook,
} from "@/lib/billing/stripe";
import { createHmac } from "node:crypto";

describe("billing/stripe", () => {
  it("reports configured iff STRIPE_SECRET_KEY is set", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(isStripeConfigured()).toBe(false);
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    expect(isStripeConfigured()).toBe(true);
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("maps (tier, cadence) to Stripe price IDs from env", () => {
    process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_m";
    process.env.STRIPE_PRICE_PRO_YEARLY = "price_pro_y";
    process.env.STRIPE_PRICE_MAX_MONTHLY = "price_max_m";
    process.env.STRIPE_PRICE_MAX_YEARLY = "price_max_y";
    expect(priceIdFor("pro", "monthly")).toBe("price_pro_m");
    expect(priceIdFor("pro", "yearly")).toBe("price_pro_y");
    expect(priceIdFor("max", "monthly")).toBe("price_max_m");
    expect(priceIdFor("max", "yearly")).toBe("price_max_y");
  });

  it("reverse-maps price IDs to tiers", () => {
    process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_m";
    process.env.STRIPE_PRICE_MAX_YEARLY = "price_max_y";
    expect(tierFromPriceId("price_pro_m")).toBe("pro");
    expect(tierFromPriceId("price_max_y")).toBe("max");
    expect(tierFromPriceId("price_unknown")).toBe("free");
    expect(tierFromPriceId(null)).toBe("free");
  });

  it("verifyWebhook accepts a correctly-signed payload", () => {
    const secret = "whsec_test";
    const payload = JSON.stringify({ id: "evt_1", type: "ping", data: { object: {} } });
    const ts = Math.floor(Date.now() / 1000);
    const sig = createHmac("sha256", secret).update(`${ts}.${payload}`).digest("hex");
    const event = verifyWebhook({
      payload,
      signatureHeader: `t=${ts},v1=${sig}`,
      secret,
    });
    expect(event.type).toBe("ping");
  });

  it("verifyWebhook rejects a tampered payload", () => {
    const secret = "whsec_test";
    const payload = JSON.stringify({ id: "evt_2", type: "ping", data: { object: {} } });
    const ts = Math.floor(Date.now() / 1000);
    const sig = createHmac("sha256", secret).update(`${ts}.${payload}`).digest("hex");
    expect(() =>
      verifyWebhook({
        payload: payload + "X",
        signatureHeader: `t=${ts},v1=${sig}`,
        secret,
      }),
    ).toThrow(/Signature mismatch/);
  });

  it("verifyWebhook rejects an old timestamp", () => {
    const secret = "whsec_test";
    const payload = JSON.stringify({ id: "evt_3", type: "ping", data: { object: {} } });
    const ts = Math.floor(Date.now() / 1000) - 10 * 60; // 10 min ago
    const sig = createHmac("sha256", secret).update(`${ts}.${payload}`).digest("hex");
    expect(() =>
      verifyWebhook({
        payload,
        signatureHeader: `t=${ts},v1=${sig}`,
        secret,
      }),
    ).toThrow(/tolerance/);
  });
});
