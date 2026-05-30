"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, CheckCircle2, Loader2 } from "lucide-react";
import { useUser } from "@/app/auth/user-provider";
import { EXCHANGE_OPTIONS } from "@/lib/auth/profile-options";
import type { ExchangeKey } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

/**
 * Preferred exchanges editor. Drives the markets-page filter and the
 * AI picks engine. Saves through /api/onboarding/profile so the same
 * validation + Zod schema runs.
 */
export function SettingsExchangesCard() {
  const { profile, refresh } = useUser();
  const [picks, setPicks] = useState<ExchangeKey[]>(
    (profile?.preferred_exchanges ?? ["US"]) as ExchangeKey[],
  );
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: ExchangeKey) {
    setPicks((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    setDone(false);
  }

  async function save() {
    if (picks.length === 0) {
      setError("Pick at least one exchange.");
      return;
    }
    setSaving(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredExchanges: picks }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(body?.error ?? `Save failed (${res.status})`);
        return;
      }
      setDone(true);
      void refresh();
      window.setTimeout(() => setDone(false), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const initialSet = new Set(profile?.preferred_exchanges ?? []);
  const dirty =
    picks.length !== initialSet.size || picks.some((p) => !initialSet.has(p));

  return (
    <section className="glass rounded-2xl p-6">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Building2 className="h-4 w-4 text-primary" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">
              Preferred exchanges
            </h2>
            <p className="text-xs text-muted-foreground">
              Drives the markets filter and your &ldquo;For you&rdquo; picks.
            </p>
          </div>
        </div>
        {done && !saving && (
          <motion.span
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-bull"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Saved
          </motion.span>
        )}
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {EXCHANGE_OPTIONS.map((e) => {
          const active = picks.includes(e.id);
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => toggle(e.id)}
              aria-pressed={active}
              className={cn(
                "flex cursor-pointer flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                active
                  ? "border-primary/50 bg-primary/8 ring-1 ring-primary/30"
                  : "border-border/60 bg-card/40 hover:border-border hover:bg-card/70",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span aria-hidden className="text-base leading-none">
                  {e.flag}
                </span>
                {e.label}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{e.tagline}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {picks.length} exchange{picks.length === 1 ? "" : "s"} selected.
          </p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-elevated disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          Save changes
        </button>
      </div>
    </section>
  );
}
