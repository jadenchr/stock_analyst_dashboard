"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile, SubscriptionTier } from "@/lib/supabase/types";
import { canAccess, resolveTier, type Feature, type Tier } from "@/lib/auth/entitlements";

/**
 * Un-generic raw client just for the profile self-heal upsert. The
 * `Database` generic on `createBrowserClient<Database>` collapses our
 * Insert shape to `never` at this single call site (a known Supabase
 * SDK deep-inference quirk) - bypassing it here keeps everything else
 * strongly typed.
 */
function getRawClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

interface UserContextValue {
  user: User | null;
  profile: Profile | null;
  tier: Tier;
  isLoading: boolean;
  can: (feature: Feature) => boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<UserContextValue | null>(null);

interface Props {
  children: ReactNode;
  initialUser: User | null;
  initialProfile: Profile | null;
}

/**
 * Client-side user context. Hydrated with server-fetched user + profile so
 * the first paint already knows who is signed in. Subscribes to Supabase
 * auth changes so the UI reacts when the user signs in / out without a
 * full reload.
 *
 * Self-healing: if a signed-in user has no profile row (trigger didn't fire
 * yet, RLS hiccup, or signed up before schema deploy) we upsert a minimal
 * row on next auth event. The entitlement system still grants `free`
 * access in that interim window via `resolveTier(user, null)`.
 */
export function UserProvider({ children, initialUser, initialProfile }: Props) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    setUser(u);
    if (u) {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .maybeSingle();
      let resolved = p as Profile | null;
      // Heal: no row → insert one with defaults sourced from auth metadata.
      if (!resolved) {
        const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
        const insertPayload = {
          id: u.id,
          email: u.email ?? null,
          full_name:
            (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? null,
          avatar_url:
            (meta.avatar_url as string | undefined) ??
            (meta.picture as string | undefined) ??
            null,
        };
        const raw = getRawClient();
        const { data: created, error } = await raw
          .from("profiles")
          .upsert(insertPayload, { onConflict: "id" })
          .select("*")
          .single();
        if (error) {
          console.error("[user-provider] profile upsert failed:", error.message);
        } else {
          resolved = created as Profile | null;
        }
      }
      setProfile(resolved);
    } else {
      setProfile(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Backstop sync - if the server-rendered initialUser was missed
    // (CDN cache, cookies set after a race, etc.), this re-reads the
    // session on mount and updates the header to show the avatar
    // immediately instead of stuck on "Sign in".
    void (async () => {
      const {
        data: { user: liveUser },
      } = await supabase.auth.getUser();
      if (liveUser && !user) {
        setUser(liveUser);
        void refresh();
      } else if (!liveUser && user) {
        setUser(null);
        setProfile(null);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        return;
      }
      if (session?.user) {
        setUser(session.user);
        // Profile may be brand-new from the signup trigger - fetch fresh
        // (and self-heal if missing).
        void refresh();
      }
    });
    return () => subscription.unsubscribe();
    // user intentionally NOT in deps - we only want the backstop on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const tier = useMemo(() => resolveTier(user, profile), [user, profile]);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      profile,
      tier,
      isLoading,
      can: (feature) => canAccess(tier, feature),
      refresh,
    }),
    [user, profile, tier, isLoading, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Render-safe fallback so non-auth-aware paths still work
    return {
      user: null,
      profile: null,
      tier: "guest",
      isLoading: false,
      can: (feature) => canAccess("guest", feature),
      refresh: async () => {},
    };
  }
  return ctx;
}

export type { Profile, SubscriptionTier };
