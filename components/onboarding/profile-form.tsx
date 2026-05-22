"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Globe2,
  Loader2,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useUser } from "@/app/auth/user-provider";
import { LiquidEther } from "@/components/effects/liquid-ether";
import type {
  ExchangeKey,
  InvestmentStyle,
  NotificationFrequency,
  Profile,
  RiskTolerance,
} from "@/lib/supabase/types";
import {
  COUNTRY_OPTIONS,
  CURRENCY_OPTIONS,
  EXCHANGE_OPTIONS,
  INVESTMENT_STYLE_OPTIONS,
  NOTIFICATION_OPTIONS,
  RISK_OPTIONS,
} from "@/lib/auth/profile-options";
import { cn } from "@/lib/utils";

interface Props {
  initial: Profile | null;
  defaultName: string;
  nextPath: string;
}

interface FormState {
  fullName: string;
  country: string;
  preferredExchanges: ExchangeKey[];
  investmentStyles: InvestmentStyle[];
  yearsInvesting: number;
  defaultCurrency: string;
  notificationFrequency: NotificationFrequency;
  riskTolerance: RiskTolerance;
}

const TOTAL_STEPS = 3;

export function ProfileForm({ initial, defaultName, nextPath }: Props) {
  const router = useRouter();
  // user is read for the hydrated header bit only; auth is server-resolved.
  const { user } = useUser();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(() => ({
    fullName: initial?.full_name ?? defaultName ?? "",
    country: initial?.country ?? "US",
    preferredExchanges: initial?.preferred_exchanges?.length
      ? initial.preferred_exchanges
      : ["US"],
    investmentStyles: initial?.investment_styles?.length
      ? initial.investment_styles
      : ["growth"],
    yearsInvesting: initial?.years_investing ?? 2,
    defaultCurrency: initial?.default_currency ?? "USD",
    notificationFrequency: initial?.notification_frequency ?? "weekly",
    riskTolerance: initial?.risk_tolerance ?? "moderate",
  }));

  // Suggest a currency when country changes — but don't override an explicit pick
  const suggestedCurrency = useMemo(() => {
    const c = COUNTRY_OPTIONS.find((o) => o.code === form.country);
    return c?.suggestedCurrency ?? "USD";
  }, [form.country]);

  function go(next: 0 | 1 | 2) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setError(null);
  }

  function toggleExchange(id: ExchangeKey) {
    setForm((f) => ({
      ...f,
      preferredExchanges: f.preferredExchanges.includes(id)
        ? f.preferredExchanges.filter((x) => x !== id)
        : [...f.preferredExchanges, id],
    }));
  }

  function toggleStyle(id: InvestmentStyle) {
    setForm((f) => ({
      ...f,
      investmentStyles: f.investmentStyles.includes(id)
        ? f.investmentStyles.filter((x) => x !== id)
        : [...f.investmentStyles, id],
    }));
  }

  const stepValid: Record<0 | 1 | 2, boolean> = {
    0: form.fullName.trim().length > 0 && form.preferredExchanges.length > 0,
    1: form.investmentStyles.length > 0 && form.yearsInvesting >= 0,
    2: true,
  };

  async function handleSave(opts: { skip?: boolean } = {}) {
    // NOTE: do NOT early-return if `user` is null here. The client-side
    // useUser() context can briefly resolve to null on first paint while
    // it rehydrates the Supabase session from cookies. The server route
    // re-derives identity from those same cookies, so the save still
    // works. Returning early here was the bug that made the button look
    // dead — the click fired, nothing happened, no error, no nav.
    console.log("[profile-form] handleSave fired", { skip: opts.skip, hasUser: Boolean(user) });
    setSaving(true);
    setError(null);
    setWarning(null);

    const body = opts.skip
      ? { skip: true }
      : {
          fullName: form.fullName.trim() || undefined,
          country: form.country,
          preferredExchanges: form.preferredExchanges,
          investmentStyles: form.investmentStyles,
          yearsInvesting: form.yearsInvesting,
          defaultCurrency: form.defaultCurrency,
          notificationFrequency: form.notificationFrequency,
          riskTolerance: form.riskTolerance,
        };

    /**
     * Race any fetch against a hard timeout so a hung network call cannot
     * trap the user on this form. 6 seconds is plenty for a tiny upsert.
     */
    async function fetchWithTimeout(input: RequestInfo, init?: RequestInit, ms = 6000) {
      const controller = new AbortController();
      const t = window.setTimeout(() => controller.abort(), ms);
      try {
        return await fetch(input, { ...init, signal: controller.signal });
      } finally {
        window.clearTimeout(t);
      }
    }

    // 1) Try the full save.
    let saveOk = false;
    let serverError: string | null = null;
    try {
      const res = await fetchWithTimeout("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; warning?: string | null; error?: string }
        | null;
      if (res.ok && data?.ok !== false) {
        saveOk = true;
        if (data?.warning) setWarning(data.warning);
      } else {
        serverError = data?.error ?? `Save failed (${res.status})`;
        console.error("[profile-form] save failed:", serverError);
      }
    } catch (e) {
      serverError = e instanceof Error ? e.message : "Network error during save";
      console.error("[profile-form] save threw:", e);
    }

    // 2) If the rich save failed, fire the always-ok escape endpoint so
    //    the user is at least marked onboarded and not bounced back here.
    //    Bounded by the same timeout — we MUST proceed to step 3.
    if (!saveOk) {
      try {
        await fetchWithTimeout("/api/onboarding/profile", {
          method: "DELETE",
          cache: "no-store",
        });
      } catch (e) {
        console.warn("[profile-form] escape fallback failed:", e);
      }
    }

    // 3) Navigate ALWAYS. Hard reload via window.location so the layout
    //    re-runs getCurrentSession() and the new onboarded state is
    //    unambiguously picked up. router.push has been observed to no-op
    //    when an RSC fetch is mid-flight, leaving the user staring at
    //    the form — window.location.assign cannot do that.
    //    NOTE: we intentionally skip `await refresh()` here — the hard
    //    reload re-runs the server session/profile fetch anyway, and a
    //    flaky Supabase client roundtrip used to hang this step.
    const target = opts.skip ? "/" : nextPath;
    if (!saveOk && serverError) {
      // Surface the error briefly before navigating so the user can
      // screenshot / report it if needed.
      setError(serverError);
      setSaving(false);
      window.setTimeout(() => {
        window.location.assign(target);
      }, 1500);
      return;
    }
    window.location.assign(target);
  }

  /**
   * Emergency escape hatch — fires the always-ok DELETE endpoint with a
   * short timeout, then hard-navigates. Never errors visibly. Always
   * reaches the dashboard.
   */
  async function handleEscape() {
    setSaving(true);
    const controller = new AbortController();
    const t = window.setTimeout(() => controller.abort(), 4000);
    try {
      await fetch("/api/onboarding/profile", {
        method: "DELETE",
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (e) {
      console.warn("[profile-form] escape failed:", e);
    } finally {
      window.clearTimeout(t);
    }
    window.location.assign("/");
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <LiquidEther intensity={0.22} position="fixed" />
      <div className="bg-aurora pointer-events-none absolute inset-0" aria-hidden />

      <header className="relative flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-8">
        <Link
          href="/"
          className="inline-flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
          aria-label="StockVision home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
          </span>
          <span className="font-display text-base font-semibold tracking-tight text-foreground">
            StockVision
          </span>
        </Link>
        <button
          type="button"
          onClick={handleEscape}
          disabled={saving}
          className="cursor-pointer rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          Skip for now
        </button>
      </header>

      <main className="relative flex flex-1 items-start justify-center px-5 pb-16 pt-8 sm:items-center sm:pt-12">
        <div className="w-full max-w-2xl">
          {/* Progress */}
          <div className="mb-8 flex items-center justify-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  i === step ? "w-10 bg-primary" : i < step ? "w-6 bg-primary/50" : "w-6 bg-border",
                )}
                aria-hidden
              />
            ))}
          </div>

          <AnimatePresence mode="wait" custom={direction} initial={false}>
            {step === 0 && (
              <Step
                key="0"
                direction={direction}
                eyebrow="Step 1 of 3 · Who you are"
                title="Welcome to StockVision"
                subtitle="A few quick details so we can tailor your dashboard."
              >
                <Field label="What should we call you?">
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder="Your name"
                    maxLength={64}
                    className="h-11 w-full rounded-lg border border-border bg-card/70 px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </Field>

                <Field label="Where are you based?" icon={Globe2}>
                  <div className="flex flex-wrap gap-2">
                    {COUNTRY_OPTIONS.map((c) => (
                      <ChipButton
                        key={c.code}
                        active={form.country === c.code}
                        onClick={() => setForm((f) => ({ ...f, country: c.code, defaultCurrency: c.suggestedCurrency }))}
                      >
                        <span aria-hidden>{c.flag}</span>
                        {c.label}
                      </ChipButton>
                    ))}
                  </div>
                </Field>

                <Field
                  label="Which exchanges do you trade or watch?"
                  hint="Pick at least one. You can change this anytime in Settings."
                  icon={Building2}
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {EXCHANGE_OPTIONS.map((e) => {
                      const active = form.preferredExchanges.includes(e.id);
                      return (
                        <SelectableCard
                          key={e.id}
                          active={active}
                          onClick={() => toggleExchange(e.id)}
                        >
                          <div className="flex items-center gap-2">
                            <span aria-hidden className="text-base leading-none">{e.flag}</span>
                            <span className="text-sm font-medium text-foreground">{e.label}</span>
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground">{e.tagline}</span>
                        </SelectableCard>
                      );
                    })}
                  </div>
                </Field>
              </Step>
            )}

            {step === 1 && (
              <Step
                key="1"
                direction={direction}
                eyebrow="Step 2 of 3 · How you invest"
                title="What's your style?"
                subtitle="Our AI uses this to suggest stocks that match how you actually invest."
              >
                <Field label="Investment style" hint="Pick all that fit." icon={Target}>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {INVESTMENT_STYLE_OPTIONS.map((s) => {
                      const active = form.investmentStyles.includes(s.id);
                      return (
                        <SelectableCard
                          key={s.id}
                          active={active}
                          onClick={() => toggleStyle(s.id)}
                        >
                          <span className="text-sm font-medium text-foreground">{s.label}</span>
                          <span className="text-[11px] leading-relaxed text-muted-foreground">
                            {s.description}
                          </span>
                        </SelectableCard>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Risk tolerance" icon={Zap}>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {RISK_OPTIONS.map((r) => (
                      <SelectableCard
                        key={r.id}
                        active={form.riskTolerance === r.id}
                        onClick={() => setForm((f) => ({ ...f, riskTolerance: r.id }))}
                      >
                        <span className="text-sm font-medium text-foreground">{r.label}</span>
                        <span className="text-[11px] leading-relaxed text-muted-foreground">
                          {r.description}
                        </span>
                      </SelectableCard>
                    ))}
                  </div>
                </Field>

                <Field label={`Years investing · ${form.yearsInvesting}+ years`}>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={form.yearsInvesting}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, yearsInvesting: Number(e.target.value) }))
                    }
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
                    aria-label="Years investing"
                  />
                  <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    <span>0</span>
                    <span>5</span>
                    <span>10</span>
                    <span>15</span>
                    <span>20+</span>
                  </div>
                </Field>
              </Step>
            )}

            {step === 2 && (
              <Step
                key="2"
                direction={direction}
                eyebrow="Step 3 of 3 · Preferences"
                title="A few small choices"
                subtitle="Display currency and how often we email you."
              >
                <Field
                  label="Default display currency"
                  hint={`Suggested: ${suggestedCurrency} based on your country.`}
                >
                  <div className="flex flex-wrap gap-2">
                    {CURRENCY_OPTIONS.map((c) => (
                      <ChipButton
                        key={c.code}
                        active={form.defaultCurrency === c.code}
                        onClick={() => setForm((f) => ({ ...f, defaultCurrency: c.code }))}
                      >
                        <span className="font-mono">{c.symbol}</span>
                        {c.code}
                      </ChipButton>
                    ))}
                  </div>
                </Field>

                <Field label="Email digest frequency">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {NOTIFICATION_OPTIONS.map((n) => (
                      <SelectableCard
                        key={n.id}
                        active={form.notificationFrequency === n.id}
                        onClick={() => setForm((f) => ({ ...f, notificationFrequency: n.id }))}
                      >
                        <span className="text-sm font-medium text-foreground">{n.label}</span>
                        <span className="text-[11px] leading-relaxed text-muted-foreground">
                          {n.description}
                        </span>
                      </SelectableCard>
                    ))}
                  </div>
                </Field>

                <div className="rounded-xl border border-primary/30 bg-primary/8 p-4 text-xs leading-relaxed text-foreground/85">
                  <p className="flex items-center gap-1.5 text-primary">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    <span className="font-semibold">AI-powered picks</span>
                  </p>
                  <p className="mt-1.5 text-muted-foreground">
                    Once you finish, we&rsquo;ll show a personalized &ldquo;For You&rdquo;
                    section on your dashboard with stocks that fit your style, risk, and exchanges.
                  </p>
                </div>
              </Step>
            )}
          </AnimatePresence>

          {warning && (
            <div
              className="mt-4 flex items-start gap-2 rounded-lg border border-neutral/30 bg-neutral/10 px-3 py-2 text-xs text-foreground/85"
              role="status"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-neutral" aria-hidden />
              <span>{warning}</span>
            </div>
          )}
          {error && (
            <div
              className="mt-4 flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              role="alert"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                <span className="break-words">{error}</span>
              </div>
              <button
                type="button"
                onClick={handleEscape}
                disabled={saving}
                className="self-start cursor-pointer rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-50"
              >
                Skip onboarding and continue to dashboard →
              </button>
            </div>
          )}

          {/* Footer controls */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => step > 0 && go((step - 1) as 0 | 1 | 2)}
              disabled={step === 0}
              className={cn(
                "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 text-xs font-medium text-foreground transition-colors hover:bg-card",
                step === 0 && "cursor-not-allowed opacity-40",
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Back
            </button>

            {step < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                onClick={() => stepValid[step] && go((step + 1) as 0 | 1 | 2)}
                disabled={!stepValid[step]}
                className={cn(
                  "group inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated",
                  !stepValid[step] && "cursor-not-allowed opacity-50 hover:translate-y-0",
                )}
              >
                Continue
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated disabled:cursor-wait disabled:opacity-80"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="h-4 w-4" aria-hidden />
                )}
                {saving ? "Saving…" : "Finish & continue"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ----------------------------------- step shell ------------- */

function Step({
  direction,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  direction: 1 | -1;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      custom={direction}
      initial={{ opacity: 0, x: direction * 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -direction * 24 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-6"
    >
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </motion.div>
  );
}

/* ----------------------------------- field shell ------------ */

function Field({
  label,
  hint,
  icon: Icon,
  children,
}: {
  label: string;
  hint?: string;
  icon?: typeof Globe2;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />}
        <span>{label}</span>
      </div>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ----------------------------------- chip & card buttons --- */

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150",
        active
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border bg-card/60 text-foreground/85 hover:border-border hover:bg-card",
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function SelectableCard({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex cursor-pointer flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all duration-200",
        active
          ? "border-primary/50 bg-primary/8 ring-1 ring-primary/30"
          : "border-border bg-card/40 hover:-translate-y-0.5 hover:border-border hover:bg-card/70",
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
