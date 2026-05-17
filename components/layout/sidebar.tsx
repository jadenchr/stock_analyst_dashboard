"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LineChart,
  Newspaper,
  Search,
  Settings,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch } from "@/lib/store/search";
import { Watchlist } from "./watchlist";

const navItems = [
  { href: "/", label: "Markets", icon: TrendingUp },
  { href: "/movers", label: "Movers", icon: Activity },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/screener", label: "Screener", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const openSearch = useSearch((s) => s.setOpen);

  return (
    <aside
      className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex"
      aria-label="Primary navigation"
    >
      {/* Brand */}
      <Link
        href="/"
        className="group flex h-16 cursor-pointer items-center gap-2.5 border-b border-sidebar-border px-5 transition-colors hover:bg-sidebar-accent/40"
        aria-label="StockVision home"
      >
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30 transition-shadow group-hover:ring-primary/60">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span className="pointer-events-none absolute inset-0 rounded-lg bg-primary/0 transition-colors group-hover:bg-primary/10" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
            StockVision
          </span>
          <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            Equity Intelligence
          </span>
        </div>
      </Link>

      {/* Search trigger */}
      <button
        type="button"
        onClick={() => openSearch(true)}
        className="group mx-3 mt-4 flex cursor-pointer items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2 text-left text-sm text-muted-foreground transition-all duration-200 ease-out-expo hover:border-border hover:bg-sidebar-accent hover:text-foreground"
        aria-label="Open search"
      >
        <Search className="h-4 w-4 transition-transform group-hover:scale-110" aria-hidden />
        <span className="flex-1">Search ticker…</span>
        <kbd className="hidden items-center gap-0.5 rounded border border-border/70 bg-background/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline-flex">
          ⌘K
        </kbd>
      </button>

      {/* Nav */}
      <nav className="mt-6 px-3" aria-label="Sections">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200",
                    active
                      ? "bg-sidebar-accent text-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary"
                      aria-hidden
                    />
                  )}
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      active
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                    aria-hidden
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Watchlist */}
      <div className="mt-6 flex flex-1 flex-col overflow-hidden border-t border-sidebar-border pt-4">
        <div className="flex items-center justify-between px-5 pb-2">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Star className="h-3 w-3" aria-hidden />
            Watchlist
          </span>
        </div>
        <Watchlist />
      </div>

      {/* Footer disclaimer */}
      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Data may be delayed up to 15 minutes.
          <br />
          AI ratings are informational, not advice.
        </p>
      </div>
    </aside>
  );
}
