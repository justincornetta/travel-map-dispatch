-- Visitor accounts. A `profiles` row mirrors each auth user and stores the
-- name + optional phone collected at registration. Email/password auth itself
-- is handled by Supabase Auth (auth.users); this is just the public-facing
-- profile data the app reads (display name) and the phone used as an alternate
-- login identifier.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

-- Phone doubles as a login identifier, so keep it unique when present.
create unique index if not exists profiles_phone_unique
  on public.profiles (phone) where phone is not null;

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select to authenticated
using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

grant select, update on public.profiles to authenticated;

-- Mirror a new auth user into profiles on signup. Runs as definer so it can
-- write the row regardless of the caller. Name/phone come from the signUp
-- metadata. If the phone is already attached to another account, keep the
-- signup but drop the phone rather than failing the whole registration.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles (id, first_name, last_name, email, phone)
    values (
      new.id,
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name',
      new.email,
      nullif(new.raw_user_meta_data->>'phone', '')
    );
  exception when unique_violation then
    insert into public.profiles (id, first_name, last_name, email, phone)
    values (
      new.id,
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name',
      new.email,
      null
    );
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
