-- purpose: add asset_id to signals and default to XAUUSD
-- affects: public.signals, public.assets
-- notes: ensures XAUUSD exists, backfills existing rows, adds fk, sets default; idempotent guards

begin;

-- ensure xauusd asset exists and capture its id
do $$
declare
  xau_id uuid;
begin
  -- create xauusd if missing
  insert into public.assets (id, symbol, name, currency)
  select gen_random_uuid(), 'XAUUSD', 'Gold', 'USD'
  where not exists (select 1 from public.assets where symbol = 'XAUUSD');

  -- read id
  select id into xau_id from public.assets where symbol = 'XAUUSD' limit 1;

  -- add column if not exists
  perform 1 from information_schema.columns
   where table_schema = 'public' and table_name = 'signals' and column_name = 'asset_id';
  if not found then
    execute 'alter table public.signals add column asset_id uuid';
  end if;

  -- backfill nulls
  execute 'update public.signals set asset_id = $1 where asset_id is null' using xau_id;

  -- set not null
  perform 1 from information_schema.columns
   where table_schema = 'public' and table_name = 'signals' and column_name = 'asset_id' and is_nullable = 'NO';
  if not found then
    execute 'alter table public.signals alter column asset_id set not null';
  end if;

  -- add fk if not exists
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'signals' and c.conname = 'signals_asset_id_fkey'
  ) then
    execute 'alter table public.signals add constraint signals_asset_id_fkey foreign key (asset_id) references public.assets(id) on delete restrict';
  end if;

  -- set default to xauusd id
  execute format('alter table public.signals alter column asset_id set default %L::uuid', xau_id::text);
end $$;

commit;
