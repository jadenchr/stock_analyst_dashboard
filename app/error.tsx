"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 pt-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 ring-1 ring-destructive/30">
        <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
      </div>
      <h1 className="font-display text-2xl tracking-tight">Something went wrong</h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        An unexpected error occurred. The team has been notified.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          <RotateCw className="h-3.5 w-3.5" aria-hidden />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-lg border border-border/70 bg-card/60 px-3 text-sm text-foreground transition-colors hover:bg-card"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
