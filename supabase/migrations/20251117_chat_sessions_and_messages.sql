-- purpose: chat sessions and messages for chatbot history
-- affects: public.chat_sessions, public.chat_messages

begin;

-- Table: chat_sessions
create table if not exists public.chat_sessions (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text, -- optional title for the session (first message or user-defined)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table: chat_messages
create table if not exists public.chat_messages (
  id uuid not null default gen_random_uuid() primary key,
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Trigger to auto update updated_at for chat_sessions
create or replace function public.cs_set_updated_at()
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
  if not exists (select 1 from pg_trigger where tgname = 'trg_cs_set_updated_at') then
    create trigger trg_cs_set_updated_at
      before update on public.chat_sessions
      for each row
      execute function public.cs_set_updated_at();
  end if;
end $$;

-- Enable RLS
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- Policies: authenticated users can manage only their own sessions
drop policy if exists cs_select_own on public.chat_sessions;
create policy cs_select_own
on public.chat_sessions
for select to authenticated
using (user_id = auth.uid());

drop policy if exists cs_write_own on public.chat_sessions;
create policy cs_write_own
on public.chat_sessions
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Policies: authenticated users can manage messages in their own sessions
drop policy if exists cm_select_own on public.chat_messages;
create policy cm_select_own
on public.chat_messages
for select to authenticated
using (
  exists (
    select 1 from public.chat_sessions
    where chat_sessions.id = chat_messages.session_id
    and chat_sessions.user_id = auth.uid()
  )
);

drop policy if exists cm_write_own on public.chat_messages;
create policy cm_write_own
on public.chat_messages
for all to authenticated
using (
  exists (
    select 1 from public.chat_sessions
    where chat_sessions.id = chat_messages.session_id
    and chat_sessions.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.chat_sessions
    where chat_sessions.id = chat_messages.session_id
    and chat_sessions.user_id = auth.uid()
  )
);

-- Indexes
create index if not exists idx_cs_user_id on public.chat_sessions (user_id);
create index if not exists idx_cs_updated_at on public.chat_sessions (updated_at desc);
create index if not exists idx_cm_session_id on public.chat_messages (session_id);
create index if not exists idx_cm_created_at on public.chat_messages (created_at);

commit;

