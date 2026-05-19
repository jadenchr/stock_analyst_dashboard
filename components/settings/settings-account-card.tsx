"use client";

import Link from "next/link";
import { Crown, LogIn, LogOut, Sparkles, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/auth/user-provider";
import { TIER_LABEL } from "@/lib/auth/entitlements";

export function SettingsAccountCard() {
  const { user, profile, tier } = useUser();
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/auth/signout", { method: "POST", redirect: "manual" });
    router.refresh();
    router.push("/");
  }

  if (!user) {
    return (
      <section
        aria-labelledby="account-heading"
        className="glass relative overflow-hidden rounded-2xl p-5"
      >
        <div className="bg-aurora pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <UserIcon className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="account-heading" className="text-sm font-semibold text-foreground">
              You&rsquo;re browsing as a guest
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Sign in to unlock AI ratings, financials, news, insider activity, and cross-device
              watchlist sync. Free, takes 5 seconds with Google.
            </p>
            <Link
              href="/auth/signin"
              className="mt-3 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-px"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden />
              Sign in
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const displayName =
    profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "Account";
  const avatarUrl = profile?.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined);

  return (
    <section
      aria-labelledby="account-heading"
      id="upgrade"
      className="glass flex flex-col gap-4 rounded-2xl p-5"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-primary/15 ring-1 ring-primary/30">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <UserIcon className="h-5 w-5 text-primary" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="account-heading" className="truncate text-sm font-semibold text-foreground">
            {displayName}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-2.5 w-2.5" aria-hidden />
              {TIER_LABEL[tier]} tier
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border/70 bg-card/60 px-3 text-xs font-medium text-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          Sign out
        </button>
      </div>

      {tier === "free" && (
        <Link
          href="/pricing"
          className="group flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/8 p-3 transition-colors hover:bg-primary/12"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Crown className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Upgrade to Pro</p>
            <p className="truncate text-[11px] text-muted-foreground">
              Portfolio tracking, custom screeners, price alerts, and priority AI ratings.
            </p>
          </div>
          <span className="inline-flex h-7 items-center rounded-md border border-primary/40 bg-primary/15 px-2 text-[11px] font-semibold text-primary transition-colors group-hover:bg-primary/20">
            View pricing
          </span>
        </Link>
      )}
    </section>
  );
}
