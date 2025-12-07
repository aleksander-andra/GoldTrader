-- purpose: store scored news events for assets (XAUUSD etc.) for AI & UI
-- affects: public.asset_events
-- notes: idempotent; uses public.set_updated_at trigger function if present

begin;

-- ensure required extension for gen_random_uuid (id generation)
create extension if not exists pgcrypto;

create table if not exists public.asset_events (
  id uuid primary key default gen_random_uuid(),
  asset text not null,
  title text not null,
  summary text not null,
  published_at timestamptz not null,
  source_name text not null,
  source_url text not null,
  direction text not null check (direction in ('POS','NEG','NEU')),
  impact_score int not null check (impact_score between 1 and 10),
  source_score numeric not null check (source_score >= 0 and source_score <= 1),
  final_score numeric not null,
  prediction_direction text null check (prediction_direction in ('POS','NEG','NEU')),
  observed_direction text null check (observed_direction in ('POS','NEG','NEU')),
  source_reliability_score numeric null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.asset_events enable row level security;

-- RLS: authenticated users can read all events; writes will be done via service role
drop policy if exists asset_events_select_all on public.asset_events;
create policy asset_events_select_all
  on public.asset_events
  for select to authenticated
  using (true);

-- updated_at trigger using generic set_updated_at() helper if available
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'asset_events'
  ) then
    if not exists (
      select 1 from pg_trigger where tgname = 'trg_asset_events_set_updated_at'
    ) then
      -- public.set_updated_at is defined in 20251031120500_add_updated_at_triggers.sql
      create trigger trg_asset_events_set_updated_at
        before update on public.asset_events
        for each row
        execute function public.set_updated_at();
    end if;
  end if;
end $$;

-- helpful index for dashboard / AI reads
create index if not exists idx_asset_events_asset_score_ts
  on public.asset_events (asset, final_score desc, published_at desc);

commit;


