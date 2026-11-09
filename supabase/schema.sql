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

-- Create a profile (with one-time trial credits) when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  interest text := new.raw_user_meta_data ->> 'plan_interest';
begin
  insert into public.profiles (id, full_name, plan_interest, credits, trial_credits_given)
  values (
    new.id,
    left(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 80),
    case
      when interest = 'ai-plus' then 'pro'
      when interest in ('basic', 'pro', 'premium') then interest
      else null
    end,
    public.trial_credits(),
    true
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

-- =========================================================== plans, credits and billing
-- Paid tools that run on our servers are paid for with credits. Each paid plan gets a
-- monthly allowance; new accounts get a one-time trial. Only the server (service role)
-- can change plans or credits: users can read them, never write them.

alter table public.profiles add column if not exists credits integer not null default 0 check (credits >= 0);
alter table public.profiles add column if not exists credits_refresh_at timestamptz;
alter table public.profiles add column if not exists trial_credits_given boolean not null default false;
alter table public.profiles add column if not exists billing_interval text check (billing_interval in ('month', 'year'));
alter table public.profiles add column if not exists stripe_customer_id text unique;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists subscription_status text;
alter table public.profiles add column if not exists current_period_end timestamptz;
alter table public.profiles add column if not exists cancel_at_period_end boolean not null default false;

-- Keep the earlier rule: users may only change their name and waitlist choice.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, plan_interest) on public.profiles to authenticated;

create or replace function public.trial_credits() returns integer language sql immutable as $$ select 20 $$;

create or replace function public.plan_credits(p text)
returns integer language sql immutable as $$
  select case p when 'premium' then 2000 when 'pro' then 700 when 'basic' then 200 else 0 end;
$$;

create or replace function public.plan_level(p text)
returns integer language sql immutable as $$
  select case p when 'premium' then 3 when 'pro' then 2 when 'basic' then 1 else 0 end;
$$;

-- Accounts created before credits existed get their one-time trial credits.
update public.profiles
set credits = credits + public.trial_credits(), trial_credits_given = true
where trial_credits_given = false;


-- AI jobs: one row per server tool run. Users can read their own; only the server writes.
create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tool text not null,
  option text,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  credits integer not null default 0,
  provider text,
  provider_ref text,
  input_path text,
  output_path text,
  output jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_jobs_user_time on public.ai_jobs (user_id, created_at desc);
alter table public.ai_jobs enable row level security;
drop policy if exists "Read own jobs" on public.ai_jobs;
create policy "Read own jobs" on public.ai_jobs for select using (auth.uid() = user_id);

-- Every credit change, for support and refunds.
create table if not exists public.credit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,
  balance_after integer not null,
  reason text not null,
  job_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists credit_events_user_time on public.credit_events (user_id, created_at desc);
alter table public.credit_events enable row level security;
drop policy if exists "Read own credit events" on public.credit_events;
create policy "Read own credit events" on public.credit_events for select using (auth.uid() = user_id);

-- One free try of each Basic and Pro tool per account.
create table if not exists public.tool_trials (
  user_id uuid not null references auth.users (id) on delete cascade,
  tool text not null check (tool ~ '^[a-z0-9-]{2,40}$'),
  used_at timestamptz not null default now(),
  primary key (user_id, tool)
);
alter table public.tool_trials enable row level security;
drop policy if exists "Read own trials" on public.tool_trials;
create policy "Read own trials" on public.tool_trials for select using (auth.uid() = user_id);

-- Stripe webhook events already handled (so a retried event is applied once).
create table if not exists public.stripe_events (
  id text primary key,
  type text,
  created_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;

-- Paid plans get a fresh monthly allowance, also on yearly billing.
create or replace function public.refresh_credits(p_user uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  p public.profiles%rowtype;
  next_at timestamptz;
begin
  select * into p from public.profiles where id = p_user for update;
  if not found or p.plan = 'free' or p.credits_refresh_at is null or p.credits_refresh_at > now() then
    return;
  end if;
  next_at := p.credits_refresh_at;
  while next_at <= now() loop
    next_at := next_at + interval '1 month';
  end loop;
  update public.profiles
  set credits = public.plan_credits(p.plan), credits_refresh_at = next_at
  where id = p_user;
  insert into public.credit_events (user_id, delta, balance_after, reason)
  values (p_user, public.plan_credits(p.plan) - p.credits, public.plan_credits(p.plan), 'monthly allowance');
end;
$$;

-- Take credits for a job. Fails (nothing taken) if the balance is too low.
create or replace function public.spend_credits(p_user uuid, p_amount integer, p_reason text, p_job uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  left_over integer;
begin
  if p_amount < 0 then
    raise exception 'invalid amount';
  end if;
  perform public.refresh_credits(p_user);
  update public.profiles set credits = credits - p_amount
  where id = p_user and credits >= p_amount
  returning credits into left_over;
  if left_over is null then
    raise exception 'not enough credits' using errcode = 'P0002';
  end if;
  insert into public.credit_events (user_id, delta, balance_after, reason, job_id)
  values (p_user, -p_amount, left_over, p_reason, p_job);
  return left_over;
end;
$$;

-- Give credits back when a job fails.
create or replace function public.refund_credits(p_user uuid, p_amount integer, p_reason text, p_job uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  balance integer;
begin
  if p_amount <= 0 then
    select credits into balance from public.profiles where id = p_user;
    return balance;
  end if;
  update public.profiles set credits = credits + p_amount where id = p_user returning credits into balance;
  insert into public.credit_events (user_id, delta, balance_after, reason, job_id)
  values (p_user, p_amount, balance, p_reason, p_job);
  return balance;
end;
$$;

-- Record a free try. Returns true the first time, false if this tool was already tried.
create or replace function public.claim_trial(p_user uuid, p_tool text)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.tool_trials (user_id, tool) values (p_user, p_tool);
  return true;
exception when unique_violation then
  return false;
end;
$$;

-- The signed-in user's own free try of an on-device tool.
create or replace function public.use_free_try(p_tool text)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  return public.claim_trial(auth.uid(), p_tool);
end;
$$;

-- Called by the Stripe webhook (service role) whenever a subscription changes.
create or replace function public.set_subscription(
  p_user uuid,
  p_plan text,
  p_interval text,
  p_status text,
  p_period_end timestamptz,
  p_customer text,
  p_subscription text,
  p_cancel_at_end boolean,
  p_new_period boolean
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  old public.profiles%rowtype;
  active boolean := p_status in ('active', 'trialing');
  new_plan text := case when active then p_plan else 'free' end;
begin
  select * into old from public.profiles where id = p_user for update;
  if not found then
    raise exception 'unknown user';
  end if;
  update public.profiles set
    plan = new_plan,
    plan_interest = case when active then null else plan_interest end,
    billing_interval = case when active then p_interval else billing_interval end,
    subscription_status = p_status,
    current_period_end = p_period_end,
    stripe_customer_id = coalesce(p_customer, stripe_customer_id),
    stripe_subscription_id = p_subscription,
    cancel_at_period_end = coalesce(p_cancel_at_end, false)
  where id = p_user;

  if not active then
    if old.plan <> 'free' then
      update public.profiles set credits = 0, credits_refresh_at = null where id = p_user;
      insert into public.credit_events (user_id, delta, balance_after, reason)
      values (p_user, -old.credits, 0, 'plan ended');
    end if;
  elsif p_new_period or old.plan <> new_plan then
    -- New subscription, renewal or plan change: full allowance for the new plan.
    update public.profiles
    set credits = public.plan_credits(new_plan), credits_refresh_at = now() + interval '1 month'
    where id = p_user;
    insert into public.credit_events (user_id, delta, balance_after, reason)
    values (p_user, public.plan_credits(new_plan) - old.credits, public.plan_credits(new_plan), 'plan ' || new_plan);
  end if;
end;
$$;

-- Server-only functions: never callable from the browser.
revoke all on function public.refresh_credits(uuid) from public, anon, authenticated;
revoke all on function public.spend_credits(uuid, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.refund_credits(uuid, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.claim_trial(uuid, text) from public, anon, authenticated;
revoke all on function public.set_subscription(uuid, text, text, text, timestamptz, text, text, boolean, boolean) from public, anon, authenticated;
revoke all on function public.use_free_try(text) from public, anon;
grant execute on function public.use_free_try(text) to authenticated;

-- Private buckets for AI tool inputs and results (deleted after processing / 24 hours).
insert into storage.buckets (id, name, public, file_size_limit)
values ('ai-inputs', 'ai-inputs', false, 104857600)
on conflict (id) do update set public = false, file_size_limit = 104857600;
insert into storage.buckets (id, name, public, file_size_limit)
values ('ai-outputs', 'ai-outputs', false, 524288000)
on conflict (id) do update set public = false, file_size_limit = 524288000;

drop policy if exists "Upload own AI inputs" on storage.objects;
create policy "Upload own AI inputs" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ai-inputs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Read own AI outputs" on storage.objects;
create policy "Read own AI outputs" on storage.objects
  for select to authenticated
  using (bucket_id = 'ai-outputs' and (storage.foldername(name))[1] = auth.uid()::text);
