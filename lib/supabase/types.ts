/**
 * Minimal hand-authored types for our Supabase schema.
 *
 * Keep these in sync with `supabase/schema.sql` and
 * `supabase/migrations/0002_full_profile.sql`. Insert/Update shapes are
 * spelled out as explicit object types (not intersections) - Supabase's
 * deep generic inference treats `Omit<Row, k> & { k?: ... }` differently
 * from a plain object type, which collapses to `never` at deep call sites.
 */

export type SubscriptionTier = "free" | "pro" | "max";
export type InvestmentStyle = "growth" | "value" | "income" | "speculation";
export type RiskTolerance = "conservative" | "moderate" | "aggressive";
export type NotificationFrequency = "daily" | "weekly" | "monthly" | "never";

/**
 * The set of exchange-family codes the UI accepts. Stored as a `text[]`
 * in the profile so the user can opt into multiple families at once.
 */
export type ExchangeKey =
  | "US"
  | "IN_NSE"
  | "IN_BSE"
  | "LK_CSE"
  | "UK"
  | "CRYPTO";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  created_at: string;
  updated_at: string;
  // Phase 7c extension
  country: string | null;
  preferred_exchanges: ExchangeKey[];
  investment_styles: InvestmentStyle[];
  years_investing: number | null;
  default_currency: string;
  notification_frequency: NotificationFrequency;
  risk_tolerance: RiskTolerance;
  onboarded: boolean;
  // Stripe billing columns (added by migration 0006)
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  stripe_status?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
}

export interface WatchlistRow {
  id: string;
  user_id: string;
  symbol: string;
  position: number;
  created_at: string;
}

export type AlertDirection = "above" | "below";
export type NotificationKind = "alert" | "system";

export interface PriceAlertRow {
  id: string;
  user_id: string;
  symbol: string;
  direction: AlertDirection;
  target_price: number;
  currency: string;
  note: string | null;
  active: boolean;
  triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  symbol: string | null;
  alert_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface PortfolioHoldingRow {
  id: string;
  user_id: string;
  symbol: string;
  shares: number;
  cost_basis: number;
  currency: string;
  purchase_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
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
          country?: string | null;
          preferred_exchanges?: ExchangeKey[];
          investment_styles?: InvestmentStyle[];
          years_investing?: number | null;
          default_currency?: string;
          notification_frequency?: NotificationFrequency;
          risk_tolerance?: RiskTolerance;
          onboarded?: boolean;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: SubscriptionTier;
          created_at?: string;
          updated_at?: string;
          country?: string | null;
          preferred_exchanges?: ExchangeKey[];
          investment_styles?: InvestmentStyle[];
          years_investing?: number | null;
          default_currency?: string;
          notification_frequency?: NotificationFrequency;
          risk_tolerance?: RiskTolerance;
          onboarded?: boolean;
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
      portfolio_holdings: {
        Row: PortfolioHoldingRow;
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          shares: number;
          cost_basis: number;
          currency?: string;
          purchase_date?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          symbol?: string;
          shares?: number;
          cost_basis?: number;
          currency?: string;
          purchase_date?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      price_alerts: {
        Row: PriceAlertRow;
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          direction: AlertDirection;
          target_price: number;
          currency?: string;
          note?: string | null;
          active?: boolean;
          triggered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          symbol?: string;
          direction?: AlertDirection;
          target_price?: number;
          currency?: string;
          note?: string | null;
          active?: boolean;
          triggered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: {
          id?: string;
          user_id: string;
          kind?: NotificationKind;
          title: string;
          body?: string | null;
          symbol?: string | null;
          alert_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: NotificationKind;
          title?: string;
          body?: string | null;
          symbol?: string | null;
          alert_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      subscription_tier: SubscriptionTier;
      investment_style: InvestmentStyle;
      risk_tolerance: RiskTolerance;
      notification_frequency: NotificationFrequency;
    };
    CompositeTypes: Record<string, never>;
  };
}

/* ----------------------------------------------- exchange label helpers - */

export const EXCHANGE_LABELS: Record<ExchangeKey, { label: string; flag: string; tz: string }> = {
  US: { label: "US (NYSE / NASDAQ)", flag: "🇺🇸", tz: "America/New_York" },
  IN_NSE: { label: "India NSE", flag: "🇮🇳", tz: "Asia/Kolkata" },
  IN_BSE: { label: "India BSE", flag: "🇮🇳", tz: "Asia/Kolkata" },
  LK_CSE: { label: "Sri Lanka CSE", flag: "🇱🇰", tz: "Asia/Colombo" },
  UK: { label: "UK LSE", flag: "🇬🇧", tz: "Europe/London" },
  CRYPTO: { label: "Crypto", flag: "₿", tz: "UTC" },
};

export const DEFAULT_GUEST_EXCHANGES: ExchangeKey[] = ["US", "IN_NSE", "LK_CSE"];
