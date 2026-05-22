"use client";

import { useUser } from "@/app/auth/user-provider";
import { PortfolioClient } from "./portfolio-client";
import { PortfolioLocked } from "./portfolio-locked";

/**
 * Routes between the real signed-in-and-Pro experience and the upgrade
 * CTA for free / guest visitors. Done client-side because `useUser()`
 * reads live auth state.
 */
export function PortfolioGate() {
  const { user, can, isLoading } = useUser();
  if (isLoading) return null;
  if (!user) return <PortfolioLocked variant="guest" />;
  if (!can("portfolio")) return <PortfolioLocked variant="free" />;
  return <PortfolioClient />;
}
