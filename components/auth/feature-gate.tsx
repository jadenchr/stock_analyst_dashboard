"use client";

import type { Feature } from "@/lib/auth/entitlements";

interface Props {
  feature: Feature;
  children: React.ReactNode;
  /** Card title shown on the CTA (no longer used). */
  title?: string;
  /** Card body shown on the CTA (no longer used). */
  description?: string;
  /** Tag like "Pro" or "Free signup" (no longer used). */
  tag?: string;
  /** Full overlay (default) or compact strip (no longer used). */
  variant?: "full" | "compact";
  className?: string;
}

/**
 * FeatureGate is a no-op pass-through.
 *
 * Every feature is now available on the free tier - the entire upsell
 * / Pro card / sign-in nudge experience has been removed. The component
 * keeps its existing import sites + prop API so we don't have to delete
 * every <FeatureGate> in the codebase; it just renders children.
 *
 * The `feature` prop is kept for documentation/future reinstatement.
 */
export function FeatureGate({ children }: Props) {
  return <>{children}</>;
}
