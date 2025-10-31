-- purpose: init core tables (profiles, assets, strategies, signals), indexes and RLS
-- affects: public.profiles, public.assets, public.strategies, public.signals
-- notes: idempotent guards where feasible; relies on supabase auth.users

begin;

-- ensure required extension for gen_random_uuid
create extension if not exists pgcrypto;

-- profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','user')) default 'user',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- rls: profiles - only owner can read; no mutations in mvp
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_own'
  ) then
    execute $$create policy profiles_select_own on public.profiles
      for select to authenticated
      using (user_id = auth.uid())$$;
  end if;
end $$;

-- assets
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  name text not null,
  currency text not null,
  created_at timestamptz not null default now()
);

alter table public.assets enable row level security;

-- rls: assets - read all (authenticated), writes only admin
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'assets' and policyname = 'assets_select_all'
  ) then
    execute $$create policy assets_select_all on public.assets
      for select to authenticated
      using (true)$$;
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'assets' and policyname = 'assets_write_admin'
  ) then
    execute $$create policy assets_write_admin on public.assets
      for all to authenticated
      using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'))$$;
  end if;
end $$;

-- strategies
create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  params_json jsonb not null default '{}',
  status text not null check (status in ('active','draft')) default 'active',
  created_at timestamptz not null default now()
);

alter table public.strategies enable row level security;

-- rls: strategies - read all (authenticated), writes only admin
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'strategies' and policyname = 'strategies_select_all'
  ) then
    execute $$create policy strategies_select_all on public.strategies
      for select to authenticated
      using (true)$$;
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'strategies' and policyname = 'strategies_write_admin'
  ) then
    execute $$create policy strategies_write_admin on public.strategies
      for all to authenticated
      using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'))$$;
  end if;
end $$;

-- signals (asset_id included per updated db-plan)
create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.strategies(id) on delete restrict,
  asset_id uuid not null references public.assets(id) on delete restrict,
  ts timestamptz not null,
  type text not null check (type in ('BUY','SELL','HOLD')),
  confidence int not null check (confidence between 0 and 100),
  meta_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.signals enable row level security;

-- rls: signals - read all (authenticated), writes only admin
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'signals' and policyname = 'signals_select_all'
  ) then
    execute $$create policy signals_select_all on public.signals
      for select to authenticated
      using (true)$$;
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'signals' and policyname = 'signals_write_admin'
  ) then
    execute $$create policy signals_write_admin on public.signals
      for all to authenticated
      using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'))$$;
  end if;
end $$;

-- indexes
create index if not exists idx_signals_ts_desc on public.signals (ts desc);
create index if not exists idx_signals_strategy_ts on public.signals (strategy_id, ts desc);
create index if not exists idx_signals_asset_ts on public.signals (asset_id, ts desc);
create index if not exists idx_strategies_status on public.strategies (status);

commit;
