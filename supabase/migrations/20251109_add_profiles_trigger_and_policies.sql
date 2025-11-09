-- purpose: ensure profiles auto-creation on signup and minimal RLS with admin bypass helper
begin;

-- 1) Auto-create profile on new auth.users row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 2) Helper to check admin role (bypasses RLS safely)
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = uid and p.role = 'admin'
  );
$$;
comment on function public.is_admin(uuid) is 'Returns true when given user_id has role=admin in public.profiles.';

-- 3) Minimal RLS for profiles
alter table if exists public.profiles enable row level security;

-- users can select their own profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = user_id);

-- users can update their own non-admin fields (coarse: allow update own row)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = user_id);

-- admins: full access
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
on public.profiles
for all
using (public.is_admin(auth.uid()));

commit;


