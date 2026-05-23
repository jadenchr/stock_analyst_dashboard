"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Transient "Profile saved" banner shown when the onboarding flow
 * redirects here with `?welcome=1`. Auto-dismisses after 6 seconds.
 *
 * The query param is stripped via router.replace once the toast
 * mounts so a refresh doesn't re-show it.
 */
export function WelcomeBanner() {
  const router = useRouter();
  const params = useSearchParams();
  const hasWelcome = params.get("welcome") === "1";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasWelcome) return;
    setVisible(true);
    // Strip the query param so a reload doesn't keep flashing the toast.
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    router.replace(url.pathname + (url.search ? url.search : ""), { scroll: false });
    const t = window.setTimeout(() => setVisible(false), 6000);
    return () => window.clearTimeout(t);
  }, [hasWelcome, router]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed left-1/2 top-20 z-50 -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          <div className="glass-strong flex items-center gap-3 rounded-2xl border border-bull/40 bg-bull/5 px-4 py-3 shadow-[0_20px_50px_-12px_hsl(var(--bull)/0.4)]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bull/15 ring-1 ring-bull/40">
              <CheckCircle2 className="h-4 w-4 text-bull" aria-hidden />
            </div>
            <div className="min-w-0 pr-2">
              <p className="text-sm font-semibold text-foreground">
                Profile saved — welcome to StockVision
              </p>
              <p className="text-[11px] text-muted-foreground">
                Your dashboard is now tuned to your style, risk, and markets.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVisible(false)}
              aria-label="Dismiss"
              className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
