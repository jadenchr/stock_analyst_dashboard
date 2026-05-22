-- =====================================================================
-- StockVision — Phase 7d portfolio tracker
-- =====================================================================
-- Per-lot model: a user can have multiple rows for the same symbol with
-- different cost bases and purchase dates. Aggregation (avg cost, total
-- shares, weight, P&L) happens at read time so the schema stays simple.
--
-- Run once in Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to re-run if you tweak something later.
-- =====================================================================

-- ----- 1.  portfolio_holdings ------------------------------------------
create table if not exists public.portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Symbol stored in our internal format (AAPL, RELIANCE.BO, JKH.N0000, BTC-USD).
  symbol text not null,
  -- Positive only. Numeric to support fractional shares (Robinhood / public).
  shares numeric(18, 8) not null check (shares > 0),
  -- Cost basis per share in the security's native currency (USD/INR/LKR/etc.)
  cost_basis numeric(18, 4) not null check (cost_basis >= 0),
  -- Currency code at time of purchase — pinned so future FX moves don't
  -- silently inflate the cost basis.
  currency text not null default 'USD',
  purchase_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portfolio_holdings_user_idx
  on public.portfolio_holdings (user_id, symbol);

create index if not exists portfolio_holdings_user_date_idx
  on public.portfolio_holdings (user_id, purchase_date desc);

-- ----- 2.  Row-Level Security ------------------------------------------
alter table public.portfolio_holdings enable row level security;

drop policy if exists "portfolio_select_own" on public.portfolio_holdings;
create policy "portfolio_select_own"
  on public.portfolio_holdings for select
  using (auth.uid() = user_id);

drop policy if exists "portfolio_insert_own" on public.portfolio_holdings;
create policy "portfolio_insert_own"
  on public.portfolio_holdings for insert
  with check (auth.uid() = user_id);

drop policy if exists "portfolio_update_own" on public.portfolio_holdings;
create policy "portfolio_update_own"
  on public.portfolio_holdings for update
  using (auth.uid() = user_id);

drop policy if exists "portfolio_delete_own" on public.portfolio_holdings;
create policy "portfolio_delete_own"
  on public.portfolio_holdings for delete
  using (auth.uid() = user_id);

-- ----- 3.  Updated-at trigger ------------------------------------------
-- Reuses public.set_updated_at() defined in supabase/schema.sql
drop trigger if exists portfolio_set_updated_at on public.portfolio_holdings;
create trigger portfolio_set_updated_at
  before update on public.portfolio_holdings
  for each row execute function public.set_updated_at();
