-- =====================================================================
-- StockVision — Phase 7c profile extension
-- =====================================================================
-- Adds the fields collected by the new post-signin profile form so the
-- /api/picks endpoint can recommend stocks tailored to each user.
--
-- Run once in Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to re-run.
-- =====================================================================

-- ----- 1.  Enums --------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'investment_style') then
    create type public.investment_style as enum ('growth', 'value', 'income', 'speculation');
  end if;
  if not exists (select 1 from pg_type where typname = 'risk_tolerance') then
    create type public.risk_tolerance as enum ('conservative', 'moderate', 'aggressive');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_frequency') then
    create type public.notification_frequency as enum ('daily', 'weekly', 'monthly', 'never');
  end if;
end$$;

-- ----- 2.  Profile columns ---------------------------------------------
alter table public.profiles
  add column if not exists country text,
  add column if not exists preferred_exchanges text[] not null default '{}'::text[],
  add column if not exists investment_styles public.investment_style[] not null default '{}'::public.investment_style[],
  add column if not exists years_investing integer,
  add column if not exists default_currency text not null default 'USD',
  add column if not exists notification_frequency public.notification_frequency not null default 'weekly',
  add column if not exists risk_tolerance public.risk_tolerance not null default 'moderate',
  add column if not exists onboarded boolean not null default false;

-- Soft bounds — defensive against bad inputs
alter table public.profiles
  drop constraint if exists profiles_years_investing_range;
alter table public.profiles
  add constraint profiles_years_investing_range check (
    years_investing is null or (years_investing >= 0 and years_investing <= 80)
  );

alter table public.profiles
  drop constraint if exists profiles_default_currency_valid;
alter table public.profiles
  add constraint profiles_default_currency_valid check (
    default_currency in ('USD', 'INR', 'LKR', 'GBP', 'EUR', 'CAD', 'AUD')
  );

-- ----- 3.  Index for picks lookups -------------------------------------
create index if not exists profiles_onboarded_idx on public.profiles (onboarded);
