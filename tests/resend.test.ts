import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { alertEmailHtml, sendEmail } from "@/lib/email/resend";

describe("email/resend", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  it("skips send when no API key is configured", async () => {
    const res = await sendEmail({ to: "a@b.com", subject: "hi", html: "<p>hi</p>" });
    expect(res.ok).toBe(false);
    expect(res.skipped).toBe(true);
  });

  it("posts to Resend when key is set, surfacing the returned id", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ id: "msg_42" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const res = await sendEmail({ to: "a@b.com", subject: "hi", html: "<p>hi</p>" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0] as unknown as [string | URL, RequestInit];
    expect(String(call[0])).toBe("https://api.resend.com/emails");
    expect(call[1]?.method).toBe("POST");
    expect(res).toEqual({ ok: true, id: "msg_42" });
  });

  it("alertEmailHtml renders subject + body with the right verb", () => {
    const out = alertEmailHtml({
      symbol: "NVDA",
      direction: "above",
      target: 1000,
      current: 1010.5,
      currency: "USD",
      note: "Re-entry zone",
    });
    expect(out.subject).toMatch(/NVDA just went above/);
    expect(out.html).toContain("NVDA");
    expect(out.html).toContain("Re-entry zone");
    expect(out.text).toMatch(/NVDA just went above/);
  });

  it("alertEmailHtml escapes potentially-malicious notes", () => {
    const out = alertEmailHtml({
      symbol: "AAPL",
      direction: "below",
      target: 100,
      current: 99,
      currency: "USD",
      note: '<script>alert(1)</script>',
    });
    expect(out.html).not.toContain("<script>");
    expect(out.html).toContain("&lt;script&gt;");
  });
});
