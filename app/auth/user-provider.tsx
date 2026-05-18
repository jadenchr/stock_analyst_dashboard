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
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile, SubscriptionTier } from "@/lib/supabase/types";
import { canAccess, tierFromProfile, type Feature, type Tier } from "@/lib/auth/entitlements";

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
 */
export function UserProvider({ children, initialUser, initialProfile }: Props) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    if (u) {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .single();
      setProfile((p as Profile | null) ?? null);
    } else {
      setProfile(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
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
        // Profile may be brand-new from the signup trigger — fetch fresh
        void refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const tier = useMemo(() => tierFromProfile(profile), [profile]);

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
