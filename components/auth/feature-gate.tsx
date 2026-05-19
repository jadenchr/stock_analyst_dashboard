"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, LogIn, Sparkles } from "lucide-react";
import { useUser } from "@/app/auth/user-provider";
import type { Feature } from "@/lib/auth/entitlements";
import { cn } from "@/lib/utils";

interface Props {
  feature: Feature;
  children: React.ReactNode;
  /** Card title shown on the CTA. */
  title?: string;
  /** Card body shown on the CTA. */
  description?: string;
  /** Tag like "Pro" or "Free signup" — auto-derived if omitted. */
  tag?: string;
  /** Full overlay (default) or compact strip. */
  variant?: "full" | "compact";
  className?: string;
}

/**
 * Wraps premium sections. When the current tier can access `feature`, renders
 * the children unchanged. Otherwise renders a CTA card with sign-in /
 * upgrade prompt while still hinting at what's behind it.
 */
export function FeatureGate({
  feature,
  children,
  title,
  description,
  tag,
  variant = "full",
  className,
}: Props) {
  const { can, tier, user, isLoading } = useUser();
  const pathname = usePathname();

  if (isLoading) {
    return <>{children}</>;
  }

  if (can(feature)) {
    return <>{children}</>;
  }

  const needsPro = tier === "free";
  const ctaHref = needsPro ? "/pricing" : `/auth/signin?next=${encodeURIComponent(pathname)}`;
  const ctaLabel = needsPro ? "Upgrade to Pro" : "Sign in to unlock";
  const Icon = needsPro ? Sparkles : LogIn;

  const resolvedTag = tag ?? (needsPro ? "Pro" : user ? "Upgrade" : "Free with signup");
  const resolvedTitle = title ?? (needsPro ? "Pro feature" : "Sign in to unlock");
  const resolvedBody =
    description ??
    (needsPro
      ? "This feature is part of the Pro plan. Upgrade to enable it."
      : "Create a free account to access this section. Takes 5 seconds with Google.");

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "glass flex items-center gap-3 rounded-xl border-l-2 border-l-primary/60 p-3",
          className,
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <Lock className="h-3.5 w-3.5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">{resolvedTitle}.</span>{" "}
          {resolvedBody}
        </div>
        <Link
          href={ctaHref}
          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-primary px-3 text-[11px] font-semibold text-primary-foreground transition-transform hover:-translate-y-px"
        >
          <Icon className="h-3 w-3" aria-hidden />
          {ctaLabel}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "glass relative h-full overflow-hidden rounded-2xl border border-primary/25",
        className,
      )}
    >
      {/* Aurora wash */}
      <div className="bg-aurora pointer-events-none absolute inset-0" aria-hidden />
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />

      <div className="relative flex flex-col items-center gap-4 p-8 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/40">
          <Lock className="h-5 w-5 text-primary" aria-hidden />
          <motion.span
            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-1 -top-1"
            aria-hidden
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </motion.span>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          {resolvedTag}
        </span>

        <div className="space-y-2">
          <h3 className="font-display text-2xl font-semibold tracking-tight">
            {resolvedTitle}
          </h3>
          <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
            {resolvedBody}
          </p>
        </div>

        <Link
          href={ctaHref}
          className="group inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <Icon className="h-4 w-4" aria-hidden />
          {ctaLabel}
        </Link>
      </div>
    </motion.div>
  );
}
