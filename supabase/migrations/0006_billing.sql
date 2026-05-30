-- =====================================================================
-- StockVision - Stripe billing columns
-- =====================================================================
-- Add Stripe-aware columns to profiles + extend subscription_tier so
-- "max" is first-class alongside "free" and "pro".
--
-- Run once. Idempotent.
-- =====================================================================

-- ----- 1.  Extend the tier enum with 'max' ------------------------------
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.subscription_tier'::regtype
      and enumlabel = 'max'
  ) then
    alter type public.subscription_tier add value 'max';
  end if;
end$$;

-- ----- 2.  Stripe columns on profiles -----------------------------------
alter table public.profiles
  add column if not exists stripe_customer_id      text unique,
  add column if not exists stripe_subscription_id  text unique,
  add column if not exists stripe_price_id         text,
  add column if not exists stripe_status           text,
  add column if not exists current_period_end      timestamptz,
  add column if not exists cancel_at_period_end    boolean not null default false;

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id);
create index if not exists profiles_stripe_subscription_idx
  on public.profiles (stripe_subscription_id);
