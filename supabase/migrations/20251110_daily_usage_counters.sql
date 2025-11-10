-- purpose: daily usage counters for per-user limits
-- affects: public.usage_counters

begin;

create table if not exists public.usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  key text not null,
  count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day, key)
);

-- trigger to auto update updated_at
create or replace function public.uc_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_uc_set_updated_at') then
    create trigger trg_uc_set_updated_at
      before update on public.usage_counters
      for each row
      execute function public.uc_set_updated_at();
  end if;
end $$;

alter table public.usage_counters enable row level security;

-- Policies: authenticated users can manage only their own rows
drop policy if exists uc_select_own on public.usage_counters;
create policy uc_select_own
on public.usage_counters
for select to authenticated
using (user_id = auth.uid());

drop policy if exists uc_write_own on public.usage_counters;
create policy uc_write_own
on public.usage_counters
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create index if not exists idx_uc_user_day on public.usage_counters (user_id, day);

commit;


