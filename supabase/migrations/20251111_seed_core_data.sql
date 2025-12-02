-- purpose: seed minimal core data for MVP (XAUUSD asset)
-- affects: public.assets
-- notes: idempotent; safe to run multiple times

begin;

-- 1) Seed core asset XAUUSD (spot gold in USD)
insert into public.assets (symbol, name, currency)
values ('XAUUSD', 'Gold spot USD', 'USD')
on conflict (symbol) do nothing;

commit;


