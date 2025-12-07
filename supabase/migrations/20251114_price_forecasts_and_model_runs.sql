-- purpose: store price forecasts and model training metadata (forecast engine)
-- affects: public.price_forecasts, public.model_runs
-- notes: idempotent; minimal RLS for reads, writes via service role

begin;

create table if not exists public.price_forecasts (
  id uuid primary key default gen_random_uuid(),
  asset text not null,
  timeframe text not null,
  forecast_horizon text not null,
  target_type text not null,
  prediction_value numeric not null,
  prediction_direction text not null,
  model_type text not null,
  model_version text not null,
  valid_from timestamptz not null,
  valid_to timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.price_forecasts enable row level security;

drop policy if exists price_forecasts_select_all on public.price_forecasts;
create policy price_forecasts_select_all
  on public.price_forecasts
  for select
  to authenticated
  using (true);

create index if not exists idx_price_forecasts_asset_tf_horizon_valid_from
  on public.price_forecasts (asset, timeframe, forecast_horizon, valid_from desc);

create table if not exists public.model_runs (
  id uuid primary key default gen_random_uuid(),
  model_type text not null,
  model_version text not null,
  asset text not null,
  timeframe text not null,
  train_start timestamptz not null,
  train_end timestamptz not null,
  val_metric_name text not null,
  val_metric_value numeric not null,
  params jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.model_runs enable row level security;

drop policy if exists model_runs_select_all on public.model_runs;
create policy model_runs_select_all
  on public.model_runs
  for select
  to authenticated
  using (true);

create index if not exists idx_model_runs_model_asset_tf_created_at
  on public.model_runs (model_type, asset, timeframe, created_at desc);

commit;


