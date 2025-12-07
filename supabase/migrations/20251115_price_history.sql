-- purpose: store historical OHLCV data for assets (forecast engine)
-- affects: public.price_history
-- notes: idempotent; unique per (asset, timeframe, ts)

begin;

create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  asset text not null,
  timeframe text not null,
  ts timestamptz not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume numeric,
  source text not null,
  created_at timestamptz not null default now()
);

alter table public.price_history enable row level security;

-- simple read-only policy for authenticated users; writes via service role
drop policy if exists price_history_select_all on public.price_history;
create policy price_history_select_all
  on public.price_history
  for select
  to authenticated
  using (true);

create unique index if not exists idx_price_history_asset_tf_ts
  on public.price_history (asset, timeframe, ts);

create index if not exists idx_price_history_asset_tf_ts_desc
  on public.price_history (asset, timeframe, ts desc);

commit;



