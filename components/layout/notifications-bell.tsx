"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useNotifications, type NotificationRow } from "@/lib/api/client";
import { useUser } from "@/app/auth/user-provider";
import { cn } from "@/lib/utils";

/**
 * Header bell. Click to open a 320-px dropdown of recent notifications
 * (newest first). Unread count rides in the corner badge.
 */
export function NotificationsBell() {
  const { user } = useUser();
  const { data, isLoading } = useNotifications({ enabled: Boolean(user) });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Don't render the bell at all for signed-out viewers - the header is
  // only mounted for them on legacy paths and we don't want to clutter
  // the marketing landing.
  if (!user) return null;

  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    await qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-border/70 hover:bg-card hover:text-foreground"
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unread > 0 && (
          <span
            className="absolute right-1 top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-bear px-1 font-mono text-[9px] font-bold text-background"
            aria-hidden
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-label="Notifications"
            className="absolute right-0 top-11 z-30 w-80 overflow-hidden rounded-xl border border-border/70 bg-popover shadow-elevated"
          >
            <header className="flex items-center justify-between border-b border-border/40 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-primary" aria-hidden />
                <span className="text-xs font-semibold text-foreground">Notifications</span>
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <CheckCheck className="h-3 w-3" aria-hidden />
                  Mark all read
                </button>
              )}
            </header>

            <div className="max-h-96 overflow-y-auto">
              {isLoading && items.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <Bell className="h-5 w-5 text-muted-foreground" aria-hidden />
                  <p className="text-xs font-medium text-foreground">No notifications yet</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Create a price alert and we&rsquo;ll ping you here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/30">
                  {items.map((n) => (
                    <NotificationItem key={n.id} n={n} onClick={() => setOpen(false)} />
                  ))}
                </ul>
              )}
            </div>

            <footer className="border-t border-border/40 px-3.5 py-2.5 text-center">
              <Link
                href="/alerts"
                onClick={() => setOpen(false)}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Manage alerts →
              </Link>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationItem({ n, onClick }: { n: NotificationRow; onClick: () => void }) {
  const unread = !n.read_at;
  const content = (
    <div
      className={cn(
        "flex flex-col gap-1 px-3.5 py-3 transition-colors hover:bg-muted/30",
        unread && "bg-primary/5",
      )}
    >
      <div className="flex items-start gap-2">
        {unread && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />}
        <p className="flex-1 text-xs font-semibold text-foreground">{n.title}</p>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {timeAgo(n.created_at)}
        </span>
      </div>
      {n.body && (
        <p className={cn("pl-3.5 text-[11px] leading-relaxed text-muted-foreground", !unread && "pl-0")}>
          {n.body}
        </p>
      )}
    </div>
  );
  if (n.symbol) {
    return (
      <li>
        <Link href={`/stock/${encodeURIComponent(n.symbol)}`} onClick={onClick}>
          {content}
        </Link>
      </li>
    );
  }
  return <li>{content}</li>;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
}
