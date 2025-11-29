-- purpose: add updated_at columns and update triggers to assets & strategies
-- affects: public.assets, public.strategies
-- notes: idempotent; keeps sql lowercase; aligns with knowledge .ai db-plan (updated_at + trigger)

begin;

-- 0) generic trigger function (idempotent)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

alter table if exists public.assets
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'assets'
  ) then
    if not exists (
      select 1 from pg_trigger where tgname = 'trg_assets_set_updated_at'
    ) then
      create trigger trg_assets_set_updated_at
        before update on public.assets
        for each row
        execute function public.set_updated_at();
    end if;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'updated_at'
  ) then
    comment on column public.assets.updated_at is 'auto-updated on each update by trigger';
  end if;
end $$;

alter table if exists public.strategies
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'strategies'
  ) then
    if not exists (
      select 1 from pg_trigger where tgname = 'trg_strategies_set_updated_at'
    ) then
      create trigger trg_strategies_set_updated_at
        before update on public.strategies
        for each row
        execute function public.set_updated_at();
    end if;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'strategies'
      and column_name = 'updated_at'
  ) then
    comment on column public.strategies.updated_at is 'auto-updated on each update by trigger';
  end if;
end $$;

commit;
