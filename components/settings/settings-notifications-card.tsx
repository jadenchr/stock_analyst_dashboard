"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useUser } from "@/app/auth/user-provider";
import type { NotificationFrequency } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const OPTIONS: { id: NotificationFrequency; label: string; desc: string }[] = [
  { id: "daily", label: "Daily", desc: "Morning brief every weekday" },
  { id: "weekly", label: "Weekly", desc: "Monday morning recap" },
  { id: "monthly", label: "Monthly", desc: "First Sunday of the month" },
  { id: "never", label: "Never", desc: "Quiet inbox, no digests" },
];

/**
 * Notification preferences. Drives the future email digest cadence
 * AND price-alert delivery (above "never" keeps alerts going). Saves
 * by reusing /api/onboarding/profile so the upsert pipeline + Zod
 * are the same as initial onboarding.
 */
export function SettingsNotificationsCard() {
  const { profile, refresh } = useUser();
  const [value, setValue] = useState<NotificationFrequency>(
    profile?.notification_frequency ?? "weekly",
  );
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: NotificationFrequency) {
    setValue(next);
    setSaving(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationFrequency: next }),
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

  return (
    <section className="glass rounded-2xl p-6">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Mail className="h-4 w-4 text-primary" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">
              Email digest
            </h2>
            <p className="text-xs text-muted-foreground">
              How often you want a curated portfolio + markets recap.
            </p>
          </div>
        </div>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />}
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

      <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {OPTIONS.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => save(o.id)}
              disabled={saving}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-left transition-all",
                active
                  ? "border-primary/50 bg-primary/8 ring-1 ring-primary/30"
                  : "border-border/60 bg-card/40 hover:border-border hover:bg-card/70",
              )}
            >
              <span className="text-sm font-medium text-foreground">{o.label}</span>
              <span className="text-[11px] leading-relaxed text-muted-foreground">{o.desc}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/40 bg-card/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <span>
          Price alerts always email regardless of this setting - those are individually configured
          on the <span className="text-foreground/85">Alerts</span> page.
        </span>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </section>
  );
}
