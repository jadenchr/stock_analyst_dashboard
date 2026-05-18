import type { ReactNode } from "react";

/**
 * Standalone layout for the onboarding flow.
 * Renders a full-bleed fixed overlay so the user gets a focused experience
 * without the root sidebar/header chrome bleeding through. Sits at z-50
 * (one below dialog/toast but above sticky/sidebar/header tokens).
 */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      {children}
    </div>
  );
}
