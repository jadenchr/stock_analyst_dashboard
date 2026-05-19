import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { SignInButton } from "@/components/auth/sign-in-button";
import { LiquidEther } from "@/components/effects/liquid-ether";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with Google to unlock AI ratings, financials, news, and watchlist sync.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function SignInPage({ searchParams }: PageProps) {
  const { next, error } = await searchParams;
  const user = await getCurrentUser();

  // Already signed in — just go where they were headed
  if (user) {
    redirect(next ?? "/");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-8">
      <Link
        href="/"
        className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back
      </Link>

      <div className="glass relative overflow-hidden rounded-2xl p-7">
        <LiquidEther intensity={0.2} />
        <div className="bg-aurora absolute inset-0" aria-hidden />
        <div className="relative">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-balance">
            Sign in to StockVision
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Unlock AI analyst ratings, financials, news sentiment, insider activity, and
            cross-device watchlist sync.
          </p>

          {error && (
            <div className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Sign-in failed. Please try again.
            </div>
          )}

          <div className="mt-6">
            <SignInButton next={next ?? "/"} />
          </div>

          <div className="mt-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" aria-hidden />
            or
            <span className="h-px flex-1 bg-border" aria-hidden />
          </div>

          <Link
            href="/"
            className="mt-4 inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-lg border border-border/70 bg-card/60 px-4 text-sm font-medium text-foreground transition-colors hover:bg-card"
          >
            Continue as guest
          </Link>

          <div className="mt-6 flex items-start gap-2 rounded-lg border border-border/40 bg-card/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bull" aria-hidden />
            <span>
              We only store your email, name, and avatar from Google. Your watchlist and
              preferences sync across devices. Never sold to third parties.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
