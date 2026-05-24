"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  next?: string;
  className?: string;
}

/**
 * Google OAuth sign-in button. Initiates a redirect to Google via Supabase.
 * We pass the `next` path through as a query param on the callback so the
 * user lands where they intended to go.
 */
export function SignInButton({ next = "/", className }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      // Build the callback URL on the current origin so localhost + prod
      // both work without env coupling.
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) {
        console.error("[signin] OAuth init failed:", error.message);
        setLoading(false);
      }
      // On success the browser is redirected to Google.
    } catch (err) {
      console.error("[signin] unexpected:", err);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "group inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg bg-foreground px-4 text-sm font-semibold text-background shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated disabled:cursor-wait disabled:opacity-70",
        className,
      )}
      aria-label="Sign in with Google"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <GoogleGlyph />
      )}
      {loading ? "Redirecting…" : "Continue with Google"}
    </button>
  );
}

/* Minimal SVG of the Google "G" - avoids a network request for the logo. */
function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.85 6.85 0 0 1 5.5 12c0-.74.13-1.45.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.4c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.4 12 5.4z"
      />
    </svg>
  );
}
