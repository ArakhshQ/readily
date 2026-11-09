-- Readily database setup for Supabase.
-- Run once: Supabase dashboard > SQL Editor > New query > paste this file > Run.
-- Safe to run again: it only creates what's missing and replaces functions.

-- =========================================================== profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 80),
  plan text not null default 'free' check (plan in ('free', 'basic', 'pro', 'premium')),
  plan_interest text check (plan_interest in ('basic', 'pro', 'premium')),
  created_at timestamptz not null default now()
);

-- Four-plan lineup (Free, Basic, Pro, Premium). Re-running this file on a database
-- set up with the earlier "AI Plus" plan moves those rows to Pro.
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles drop constraint if exists profiles_plan_interest_check;
update public.profiles set plan = 'pro' where plan = 'ai-plus';
update public.profiles set plan_interest = 'pro' where plan_interest = 'ai-plus';
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('free', 'basic', 'pro', 'premium'));
alter table public.profiles add constraint profiles_plan_interest_check
  check (plan_interest in ('basic', 'pro', 'premium'));

alter table public.profiles enable row level security;

drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Users may change their name and waitlist choice, never their plan.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, plan_interest) on public.profiles to authenticated;

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  interest text := new.raw_user_meta_data ->> 'plan_interest';
begin
  insert into public.profiles (id, full_name, plan_interest)
  values (
    new.id,
    left(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 80),
    case
      when interest = 'ai-plus' then 'pro'
      when interest in ('basic', 'pro', 'premium') then interest
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage and history allowances per plan.
create or replace function public.plan_storage_bytes(p text)
returns bigint language sql immutable as $$
  select case p
    when 'premium' then 25::bigint * 1024 * 1024 * 1024
    when 'pro' then 10::bigint * 1024 * 1024 * 1024
    when 'basic' then 2::bigint * 1024 * 1024 * 1024
    else 100::bigint * 1024 * 1024
  end;
$$;

-- =========================================================== history
-- Names and sizes of results only. The files themselves are never sent here.
create table if not exists public.history (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tool text not null check (char_length(tool) <= 40),
  files jsonb not null default '[]'::jsonb check (jsonb_typeof(files) = 'array'),
  created_at timestamptz not null default now()
);
create index if not exists history_user_time on public.history (user_id, created_at desc);

alter table public.history enable row level security;

drop policy if exists "Read own history" on public.history;
create policy "Read own history" on public.history
  for select using (auth.uid() = user_id);

drop policy if exists "Add own history" on public.history;
create policy "Add own history" on public.history
  for insert with check (auth.uid() = user_id);

drop policy if exists "Delete own history" on public.history;
create policy "Delete own history" on public.history
  for delete using (auth.uid() = user_id);

-- Free plan keeps 30 days: tidy old rows whenever a new one is added.
create or replace function public.trim_free_history()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if coalesce((select plan from public.profiles where id = new.user_id), 'free') = 'free' then
    delete from public.history
    where user_id = new.user_id and created_at < now() - interval '30 days';
  end if;
  return new;
end;
$$;

drop trigger if exists history_trim on public.history;
create trigger history_trim
  after insert on public.history
  for each row execute function public.trim_free_history();

-- =========================================================== saved files
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) <= 255),
  size bigint not null check (size >= 0),
  mime text,
  path text not null unique,
  tool text,
  created_at timestamptz not null default now()
);
create index if not exists files_user_time on public.files (user_id, created_at desc);

alter table public.files enable row level security;

drop policy if exists "Read own files" on public.files;
create policy "Read own files" on public.files
  for select using (auth.uid() = user_id);

drop policy if exists "Add own files" on public.files;
create policy "Add own files" on public.files
  for insert with check (auth.uid() = user_id and split_part(path, '/', 1) = auth.uid()::text);

drop policy if exists "Delete own files" on public.files;
create policy "Delete own files" on public.files
  for delete using (auth.uid() = user_id);

-- Enforce each plan's storage allowance on the server.
create or replace function public.check_storage_quota()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  used bigint;
  allowed bigint;
begin
  select coalesce(sum(size), 0) into used from public.files where user_id = new.user_id;
  select public.plan_storage_bytes(coalesce((select plan from public.profiles where id = new.user_id), 'free')) into allowed;
  if used + new.size > allowed then
    raise exception 'storage limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists files_quota on public.files;
create trigger files_quota
  before insert on public.files
  for each row execute function public.check_storage_quota();

-- =========================================================== storage bucket
-- Private bucket; each user can only reach the folder named after their id.
insert into storage.buckets (id, name, public, file_size_limit)
values ('user-files', 'user-files', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists "Read own stored files" on storage.objects;
create policy "Read own stored files" on storage.objects
  for select to authenticated
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Upload own stored files" on storage.objects;
create policy "Upload own stored files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Delete own stored files" on storage.objects;
create policy "Delete own stored files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================== delete account
-- The app removes the user's stored files first, then calls this.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
