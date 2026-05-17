"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, CornerDownLeft, Loader2, Search as SearchIcon, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useSearch } from "@/lib/store/search";
import { SearchQuerySchema, safeTicker } from "@/lib/utils/validators";
import { useSearchQuery } from "@/lib/api/client";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

interface DisplayItem {
  kind: "result" | "recent";
  ticker: string;
  name?: string;
  exchange?: string;
}

export function SearchOverlay() {
  const router = useRouter();
  const open = useSearch((s) => s.open);
  const setOpen = useSearch((s) => s.setOpen);
  const recent = useSearch((s) => s.recent);
  const pushRecent = useSearch((s) => s.pushRecent);
  const clearRecent = useSearch((s) => s.clearRecent);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const debounced = useDebouncedValue(query, 180);
  const safeQuery = useMemo(() => {
    const parsed = SearchQuerySchema.safeParse(debounced);
    return parsed.success ? parsed.data : "";
  }, [debounced]);

  const { data: results, isFetching, isError } = useSearchQuery(safeQuery);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
    setQuery("");
  }, [open]);

  const showRecent = safeQuery.length === 0 && recent.length > 0;

  const items: DisplayItem[] = showRecent
    ? recent.map<DisplayItem>((t) => ({ kind: "recent", ticker: t }))
    : (results ?? []).map<DisplayItem>((r) => ({
        kind: "result",
        ticker: r.symbol,
        name: r.name,
        exchange: r.exchange,
      }));

  function handleNavigate(symbol: string) {
    const clean = safeTicker(symbol);
    if (!clean) return;
    pushRecent(clean);
    setOpen(false);
    router.push(`/stock/${clean}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[activeIndex]) {
        handleNavigate(items[activeIndex].ticker);
      } else if (safeQuery) {
        handleNavigate(safeQuery);
      }
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="fixed inset-0 z-40 bg-background/70 backdrop-blur-md"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild aria-describedby={undefined}>
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-x-0 top-0 z-50 mx-auto flex h-full w-full max-w-2xl flex-col p-0 sm:inset-x-auto sm:top-[12vh] sm:h-auto sm:px-4"
              >
                <div className="glass-strong flex h-full flex-col overflow-hidden rounded-none border-x-0 border-b border-t-0 border-border sm:h-auto sm:rounded-2xl sm:border sm:shadow-elevated">
                  <Dialog.Title className="sr-only">Search stocks</Dialog.Title>

                  {/* Input row */}
                  <div className="flex h-14 items-center gap-3 border-b border-border/70 px-4">
                    {isFetching ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                    ) : (
                      <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value.slice(0, 40));
                        setActiveIndex(0);
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Search ticker or company…"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      maxLength={40}
                      className="h-full flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
                      aria-label="Search"
                    />
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
                      aria-label="Close search"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                    <kbd className="hidden items-center rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
                      ESC
                    </kbd>
                  </div>

                  {/* Results */}
                  <div className="flex flex-1 flex-col overflow-y-auto py-2">
                    {showRecent && (
                      <div className="flex items-center justify-between px-4 py-1.5">
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          <Clock className="h-3 w-3" aria-hidden />
                          Recent
                        </span>
                        <button
                          type="button"
                          onClick={clearRecent}
                          className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Clear
                        </button>
                      </div>
                    )}

                    {items.length === 0 ? (
                      <EmptyState query={safeQuery} isError={isError} isFetching={isFetching} />
                    ) : (
                      <ul role="listbox" aria-label="Search results">
                        {items.map((item, i) => (
                          <li key={`${item.kind}-${item.ticker}-${i}`}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={i === activeIndex}
                              onMouseEnter={() => setActiveIndex(i)}
                              onClick={() => handleNavigate(item.ticker)}
                              className={cn(
                                "flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150",
                                i === activeIndex ? "bg-muted/70" : "hover:bg-muted/40",
                              )}
                            >
                              <span className="badge-ticker min-w-[4rem] justify-center">
                                {item.ticker}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm text-foreground">
                                  {item.name ?? "Recent search"}
                                </p>
                                {item.exchange && (
                                  <p className="text-[11px] text-muted-foreground">
                                    {item.exchange}
                                  </p>
                                )}
                              </div>
                              {i === activeIndex && (
                                <CornerDownLeft
                                  className="h-3.5 w-3.5 text-muted-foreground"
                                  aria-hidden
                                />
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Footer hint */}
                  <div className="hidden items-center justify-between gap-4 border-t border-border/70 px-4 py-2 text-[11px] text-muted-foreground sm:flex">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Kbd>↑</Kbd>
                        <Kbd>↓</Kbd>
                        Navigate
                      </span>
                      <span className="flex items-center gap-1">
                        <Kbd>↵</Kbd>
                        Open
                      </span>
                    </div>
                    <span>Yahoo Finance</span>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded border border-border/70 bg-muted/60 px-1 font-mono text-[10px] text-muted-foreground">
      {children}
    </kbd>
  );
}

function EmptyState({
  query,
  isError,
  isFetching,
}: {
  query: string;
  isError: boolean;
  isFetching: boolean;
}) {
  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <p className="text-sm text-foreground">Search unavailable</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          We couldn&rsquo;t reach the data provider. Press Enter to navigate to the symbol
          directly.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      {query.length === 0 ? (
        <>
          <p className="text-sm text-foreground">Search any stock</p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Try a ticker like <span className="font-mono text-foreground">AAPL</span>,{" "}
            <span className="font-mono text-foreground">NVDA</span>, or a company name.
          </p>
        </>
      ) : isFetching ? (
        <p className="text-sm text-muted-foreground">Searching…</p>
      ) : (
        <>
          <p className="text-sm text-foreground">No matches for &ldquo;{query}&rdquo;</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Press Enter to search the ticker directly.
          </p>
        </>
      )}
    </div>
  );
}
