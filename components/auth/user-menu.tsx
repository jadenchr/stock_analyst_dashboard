"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogIn, LogOut, Settings, Sparkles, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/app/auth/user-provider";
import { TIER_LABEL } from "@/lib/auth/entitlements";
import { cn } from "@/lib/utils";

/**
 * Compact identity widget for the header.
 *   • Guest → "Sign in" button
 *   • Signed in → avatar + dropdown (Email, Tier, Settings, Sign out)
 */
export function UserMenu() {
  const { user, profile, tier } = useUser();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside-click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function handleSignOut(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await fetch("/auth/signout", { method: "POST", redirect: "manual" });
    setOpen(false);
    router.refresh();
    router.push("/");
  }

  if (!user) {
    return (
      <Link
        href="/auth/signin"
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-px hover:shadow-elevated"
      >
        <LogIn className="h-3.5 w-3.5" aria-hidden />
        Sign in
      </Link>
    );
  }

  const displayName =
    profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "Account";
  const avatarUrl = profile?.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined);
  const initial =
    (profile?.full_name ?? user.email ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-card/60 pl-1 pr-2 text-xs font-medium text-foreground transition-colors hover:bg-card"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md bg-primary/15 ring-1 ring-primary/30">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="font-mono text-[11px] font-semibold text-primary">{initial}</span>
          )}
        </span>
        <span className="hidden max-w-[120px] truncate sm:inline">{displayName}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong absolute right-0 top-[calc(100%+6px)] z-50 w-64 overflow-hidden rounded-xl border border-border shadow-elevated"
          >
            <div className="flex items-center gap-3 border-b border-border/60 px-3 py-3">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-primary/15 ring-1 ring-primary/30">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserIcon className="h-4 w-4 text-primary" aria-hidden />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="border-b border-border/60 px-3 py-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-2.5 w-2.5" aria-hidden />
                {TIER_LABEL[tier]} tier
              </span>
            </div>

            <div className="py-1">
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-xs text-foreground transition-colors hover:bg-muted/50"
              >
                <Settings className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                Settings
              </Link>
              <Link
                href="/watchlist"
                onClick={() => setOpen(false)}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-xs text-foreground transition-colors hover:bg-muted/50"
              >
                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                My watchlist
              </Link>
              <form onSubmit={handleSignOut}>
                <button
                  type="submit"
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-xs text-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden />
                  Sign out
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
