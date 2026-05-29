import "server-only";

/**
 * Resend email client - thin REST wrapper, no SDK dependency.
 *
 * Env vars:
 *   RESEND_API_KEY       required to actually send
 *   RESEND_FROM_EMAIL    optional, defaults to "alerts@stockvision.app"
 *
 * Degrades gracefully: if no API key is set, sendEmail() logs and
 * returns { ok: false, skipped: true } so the caller can keep going.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "StockVision Alerts <alerts@stockvision.app>";

interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Override the From address for this send. */
  from?: string;
}

interface SendResult {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[resend] RESEND_API_KEY not set - skipping send to", args.to);
    return { ok: false, skipped: true };
  }
  const from = args.from ?? process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
      // Don't let a slow Resend call hang a cron tick.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[resend] HTTP", res.status, body.slice(0, 240));
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = (await res.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[resend] threw:", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

/* ---------------- templates ---------------- */

/**
 * Renders the body for a price-alert email. Minimal HTML so it reads
 * cleanly even in plain-text-only mail clients.
 */
export function alertEmailHtml(args: {
  symbol: string;
  direction: "above" | "below";
  target: number;
  current: number;
  currency: string;
  note?: string | null;
}): { subject: string; html: string; text: string } {
  const verb = args.direction === "above" ? "above" : "below";
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: args.currency || "USD",
    maximumFractionDigits: 4,
  });
  const subject = `${args.symbol} just went ${verb} ${fmt.format(args.target)}`;
  const safeNote = args.note ? escapeHtml(args.note) : null;
  const html = `<!DOCTYPE html>
<html><body style="background:#0a0a0c;margin:0;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#f5f3f6;">
  <div style="max-width:520px;margin:0 auto;background:#15151a;border:1px solid #2a2730;border-radius:16px;padding:28px;">
    <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#c5a4dc;">StockVision alert</p>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#f5f3f6;">${escapeHtml(args.symbol)} just went ${verb} ${escapeHtml(fmt.format(args.target))}</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#a8a3b3;">
      Current price: <strong style="color:#f5f3f6;">${escapeHtml(fmt.format(args.current))}</strong>
    </p>
    ${safeNote ? `<div style="background:#1f1d26;border-radius:10px;padding:12px 14px;font-size:13px;line-height:1.55;color:#cfcad8;margin-bottom:20px;">${safeNote}</div>` : ""}
    <a href="https://stockvision-ai.vercel.app/stock/${encodeURIComponent(args.symbol)}" style="display:inline-block;background:#c5a4dc;color:#0a0a0c;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:600;font-size:13px;">Open ${escapeHtml(args.symbol)} -&gt;</a>
    <p style="margin:24px 0 0;font-size:11px;color:#605c6b;">Alert fires once when the price crosses your threshold. Re-enable from the Alerts page to watch it again.</p>
  </div>
</body></html>`;
  const text = `${args.symbol} just went ${verb} ${fmt.format(args.target)}\nCurrent: ${fmt.format(args.current)}${safeNote ? "\nNote: " + args.note : ""}\nhttps://stockvision-ai.vercel.app/stock/${args.symbol}`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
