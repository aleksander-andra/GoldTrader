-- purpose: extend signals with status, validity window and evaluation fields
-- affects: public.signals
-- notes: idempotent; keeps existing data by backfilling basic defaults

begin;

alter table public.signals
  add column if not exists status text
    constraint signals_status_check check (status in ('candidate','accepted','rejected','expired')),
  add column if not exists forecast_price numeric,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_to timestamptz,
  add column if not exists realized_price numeric,
  add column if not exists realized_direction text
    constraint signals_realized_direction_check check (realized_direction in ('UP','DOWN','FLAT')),
  add column if not exists hit boolean;

-- Backfill minimal defaults for existing rows: treat them as accepted signals
-- valid at their timestamp with 1h horizon.
update public.signals
set
  status = coalesce(status, 'accepted'),
  valid_from = coalesce(valid_from, ts),
  valid_to = coalesce(valid_to, ts + interval '60 minutes')
where status is null
   or valid_from is null
   or valid_to is null;

commit;



