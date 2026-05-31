"use client";

import { useUser } from "@/app/auth/user-provider";
import { PortfolioClient } from "./portfolio-client";

/**
 * Portfolio is free for everyone signed in. Middleware redirects guests
 * to /auth/signin before this client gate ever runs, so we just mount
 * the real client here.
 */
export function PortfolioGate() {
  const { isLoading } = useUser();
  if (isLoading) return null;
  return <PortfolioClient />;
}
