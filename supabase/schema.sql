-- =====================================================================
-- StockVision — Phase 7a schema
-- =====================================================================
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- It is idempotent: safe to re-run if you tweak something later.
--
-- Tables:
--   profiles    one row per signed-in user; mirrors auth.users + tier
--   watchlists  per-user tickers with positional ordering
--
-- Security model:
--   Row-Level Security ON for every table.
--   Each user can read/write ONLY their own rows.
--   Anonymous (anon) role gets NO access.
-- =====================================================================

-- ----- 1.  Tier enum ----------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_tier') then
    create type public.subscription_tier as enum ('free', 'pro');
  end if;
end$$;

-- ----- 2.  profiles ----------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  subscription_tier public.subscription_tier not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- ----- 3.  watchlists ---------------------------------------------------
create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

create index if not exists watchlists_user_position_idx
  on public.watchlists (user_id, position);

alter table public.watchlists enable row level security;

drop policy if exists "watchlists_select_own" on public.watchlists;
create policy "watchlists_select_own"
  on public.watchlists for select
  using (auth.uid() = user_id);

drop policy if exists "watchlists_insert_own" on public.watchlists;
create policy "watchlists_insert_own"
  on public.watchlists for insert
  with check (auth.uid() = user_id);

drop policy if exists "watchlists_update_own" on public.watchlists;
create policy "watchlists_update_own"
  on public.watchlists for update
  using (auth.uid() = user_id);

drop policy if exists "watchlists_delete_own" on public.watchlists;
create policy "watchlists_delete_own"
  on public.watchlists for delete
  using (auth.uid() = user_id);

-- ----- 4.  Trigger: create profile on signup ----------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----- 5.  Updated-at trigger for profiles ------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
