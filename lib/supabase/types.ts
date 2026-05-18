/**
 * Minimal hand-authored types for our Supabase schema.
 *
 * Keep these in sync with `supabase/schema.sql`. We do NOT use
 * `supabase gen types` here to keep deployment fully decoupled from
 * Supabase CLI.
 *
 * Note on Insert/Update shapes: Supabase's deep generic inference treats
 * `Omit<Row, k> & { k?: ... }` intersections differently from explicit
 * object types — the former occasionally collapses to `never` at deep
 * call sites. We spell each shape out explicitly to keep `.insert()` and
 * `.upsert()` typed end-to-end.
 */

export type SubscriptionTier = "free" | "pro";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  created_at: string;
  updated_at: string;
}

export interface WatchlistRow {
  id: string;
  user_id: string;
  symbol: string;
  position: number;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: SubscriptionTier;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: SubscriptionTier;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      watchlists: {
        Row: WatchlistRow;
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          symbol?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      subscription_tier: SubscriptionTier;
    };
    CompositeTypes: Record<string, never>;
  };
}
