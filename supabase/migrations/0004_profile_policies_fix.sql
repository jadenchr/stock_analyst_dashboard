-- =====================================================================
-- StockVision — Fix sign-in onboarding flow
-- =====================================================================
-- Why: When a brand-new Google-OAuth user lands on the onboarding form
-- and submits it, the upsert hit two latent issues:
--
--   1) `public.profiles` only had SELECT/UPDATE policies. The upsert in
--      the form runs INSERT … ON CONFLICT (id) DO UPDATE; even though
--      the row already exists from the on-signup trigger, Postgres still
--      evaluates the INSERT path and rejects without an INSERT policy.
--
--   2) Migration 0002 (the v7c profile columns) may not have been applied
--      to every Supabase project. If `onboarded`, `preferred_exchanges`,
--      etc. are missing, the form save errors with 42703 (undefined_column)
--      and the user is stuck on the form.
--
-- This migration re-applies the v7c columns idempotently AND adds the
-- missing INSERT policy. Safe to re-run.
--
-- Run once in Supabase SQL editor:
--   Dashboard → SQL → New query → paste this whole file → Run.
-- =====================================================================

-- ----- 1.  Re-apply v7c enums (idempotent) -----------------------------
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

-- ----- 2.  Re-apply v7c profile columns (idempotent) ------------------
alter table public.profiles
  add column if not exists country text,
  add column if not exists preferred_exchanges text[] not null default '{}'::text[],
  add column if not exists investment_styles public.investment_style[] not null default '{}'::public.investment_style[],
  add column if not exists years_investing integer,
  add column if not exists default_currency text not null default 'USD',
  add column if not exists notification_frequency public.notification_frequency not null default 'weekly',
  add column if not exists risk_tolerance public.risk_tolerance not null default 'moderate',
  add column if not exists onboarded boolean not null default false;

-- ----- 3.  Add missing INSERT policy on profiles ----------------------
-- Without this, `.upsert()` from the client fails because Postgres
-- evaluates the INSERT branch of ON CONFLICT first.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Belt-and-suspenders: ensure the SELECT/UPDATE policies exist too,
-- so this migration is self-sufficient for projects that somehow
-- never ran the original schema.sql.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- ----- 4.  Loosen the currency check to match the UI ------------------
-- The UI lets users pick JPY for Japan; the original 0002 constraint
-- omitted it. Re-create with the full list to avoid spurious failures.
alter table public.profiles
  drop constraint if exists profiles_default_currency_valid;
alter table public.profiles
  add constraint profiles_default_currency_valid check (
    default_currency in ('USD', 'INR', 'LKR', 'GBP', 'EUR', 'CAD', 'AUD', 'JPY')
  );

-- ----- 5.  Index for picks lookups (no-op if already present) ---------
create index if not exists profiles_onboarded_idx on public.profiles (onboarded);

-- ----- 6.  Self-heal: mark any pre-existing user as onboarded ---------
-- If you have users in `profiles` from before the onboarded column
-- existed, this avoids forcing them through the new flow on next login.
-- Comment out if you want everyone to re-onboard explicitly.
update public.profiles
   set onboarded = true
 where onboarded = false
   and created_at < now() - interval '1 day';
