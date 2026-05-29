-- =====================================================================
-- StockVision - Price alerts + in-app notifications
-- =====================================================================
-- Two tables behind the Pro "Alerts" feature.
--
-- price_alerts  one rule per row.  When the live price for `symbol`
--               crosses `target_price` in `direction`, the cron handler
--               at /api/cron/check-alerts fires a notification row
--               (and, if Resend is configured, an email) and flips
--               `triggered_at`.  One-shot by default: the alert stays
--               but stops firing until the user clears it.
--
-- notifications The user-visible feed shown in the header bell.
--
-- Run once in Supabase SQL editor.  Idempotent.
-- =====================================================================

-- ----- 1.  Enums --------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'alert_direction') then
    create type public.alert_direction as enum ('above', 'below');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_kind') then
    create type public.notification_kind as enum ('alert', 'system');
  end if;
end$$;

-- ----- 2.  price_alerts -------------------------------------------------
create table if not exists public.price_alerts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  symbol        text not null,
  direction     public.alert_direction not null,
  target_price  numeric(18, 4) not null check (target_price > 0),
  currency      text not null default 'USD',
  note          text,
  active        boolean not null default true,
  -- When the alert most recently fired (null if it never has).
  triggered_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists price_alerts_user_idx
  on public.price_alerts (user_id, active);
create index if not exists price_alerts_active_idx
  on public.price_alerts (active) where active = true;

alter table public.price_alerts enable row level security;

drop policy if exists "price_alerts_select_own" on public.price_alerts;
create policy "price_alerts_select_own"
  on public.price_alerts for select
  using (auth.uid() = user_id);

drop policy if exists "price_alerts_insert_own" on public.price_alerts;
create policy "price_alerts_insert_own"
  on public.price_alerts for insert
  with check (auth.uid() = user_id);

drop policy if exists "price_alerts_update_own" on public.price_alerts;
create policy "price_alerts_update_own"
  on public.price_alerts for update
  using (auth.uid() = user_id);

drop policy if exists "price_alerts_delete_own" on public.price_alerts;
create policy "price_alerts_delete_own"
  on public.price_alerts for delete
  using (auth.uid() = user_id);

drop trigger if exists price_alerts_set_updated_at on public.price_alerts;
create trigger price_alerts_set_updated_at
  before update on public.price_alerts
  for each row execute function public.set_updated_at();

-- ----- 3.  notifications ------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        public.notification_kind not null default 'alert',
  title       text not null,
  body        text,
  symbol      text,
  -- Optional link back to the price_alert that produced this entry.
  alert_id    uuid references public.price_alerts(id) on delete set null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own"
  on public.notifications for insert
  with check (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications for delete
  using (auth.uid() = user_id);
