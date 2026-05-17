"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LineChart, Newspaper, Star, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Markets", icon: TrendingUp },
  { href: "/movers", label: "Movers", icon: Activity },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/screener", label: "Screener", icon: LineChart },
  { href: "/watchlist", label: "Watchlist", icon: Star },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/70 bg-background/85 backdrop-blur-md lg:hidden"
      aria-label="Bottom navigation"
    >
      <ul className="mx-auto flex max-w-md items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "relative flex cursor-pointer flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors duration-200",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    transition={{ type: "spring", stiffness: 360, damping: 30 }}
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary"
                    aria-hidden
                  />
                )}
                <Icon
                  className={cn("h-5 w-5 transition-transform", active && "scale-110")}
                  aria-hidden
                />
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
