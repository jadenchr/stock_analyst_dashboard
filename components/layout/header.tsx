"use client";

import { Menu, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearch } from "@/lib/store/search";
import { MarketStatusPill } from "./market-status-pill";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { cn } from "@/lib/utils";

export function Header() {
  const openSearch = useSearch((s) => s.setOpen);
  const [scrolled, setScrolled] = useState(false);

  // Subtle elevation on scroll — gives the header weight when content moves under it
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/70 px-4 backdrop-blur-md transition-[border-color,box-shadow] duration-200 sm:px-6 lg:px-8",
        scrolled
          ? "border-border/80 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]"
          : "border-border/40",
      )}
    >
      {/* Mobile brand */}
      <Link
        href="/"
        className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80 lg:hidden"
        aria-label="StockVision home"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
        </div>
        <span className="font-display text-base font-semibold tracking-tight">StockVision</span>
      </Link>

      {/* Mobile search trigger */}
      <button
        type="button"
        onClick={() => openSearch(true)}
        className="ml-auto flex h-9 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-3 text-sm text-muted-foreground transition-all duration-200 hover:border-border hover:bg-card hover:text-foreground lg:hidden"
        aria-label="Open search"
      >
        <Search className="h-4 w-4" aria-hidden />
        <span className="flex-1 truncate text-left">Search ticker…</span>
      </button>

      {/* Desktop center: per-exchange market status driven by user prefs */}
      <div className="hidden min-w-0 flex-1 items-center gap-3 overflow-x-auto lg:flex">
        <MarketStatusPill />
      </div>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => openSearch(true)}
          className="hidden h-9 cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-3 text-sm text-muted-foreground transition-all duration-200 hover:border-border hover:bg-card hover:text-foreground lg:flex"
          aria-label="Open search"
        >
          <Search className="h-4 w-4" aria-hidden />
          <span>Search</span>
          <kbd className="ml-1 inline-flex items-center rounded border border-border/70 bg-background/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        <ThemeToggle />

        <UserMenu />

        <button
          type="button"
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors duration-200 hover:border-border/70 hover:bg-card hover:text-foreground lg:hidden"
          aria-label="Menu"
        >
          <Menu className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </header>
  );
}
