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
  for select using ((select auth.uid()) = id);

drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

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
-- Only runs as a trigger; nobody can call it directly.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Storage and history allowances per plan.
create or replace function public.plan_storage_bytes(p text)
returns bigint language sql immutable set search_path = '' as $$
  select case p
    when 'premium' then 25::bigint * 1024 * 1024 * 1024
    when 'pro' then 10::bigint * 1024 * 1024 * 1024
    when 'basic' then 2::bigint * 1024 * 1024 * 1024
    else 20::bigint * 1024 * 1024
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
  for select using ((select auth.uid()) = user_id);

drop policy if exists "Add own history" on public.history;
create policy "Add own history" on public.history
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Delete own history" on public.history;
create policy "Delete own history" on public.history
  for delete using ((select auth.uid()) = user_id);

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
-- Only runs as a trigger; nobody can call it directly.
revoke all on function public.trim_free_history() from public, anon, authenticated;

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
  for select using ((select auth.uid()) = user_id);

drop policy if exists "Add own files" on public.files;
create policy "Add own files" on public.files
  for insert with check ((select auth.uid()) = user_id and split_part(path, '/', 1) = (select auth.uid())::text);

drop policy if exists "Delete own files" on public.files;
create policy "Delete own files" on public.files
  for delete using ((select auth.uid()) = user_id);

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
-- Only runs as a trigger; nobody can call it directly.
revoke all on function public.check_storage_quota() from public, anon, authenticated;

-- =========================================================== storage bucket
-- Private bucket; each user can only reach the folder named after their id.
insert into storage.buckets (id, name, public, file_size_limit)
values ('user-files', 'user-files', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists "Read own stored files" on storage.objects;
create policy "Read own stored files" on storage.objects
  for select to authenticated
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Upload own stored files" on storage.objects;
create policy "Upload own stored files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'user-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Delete own stored files" on storage.objects;
create policy "Delete own stored files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

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

create or replace function public.trial_credits() returns integer language sql immutable set search_path = '' as $$ select 20 $$;

create or replace function public.plan_credits(p text)
returns integer language sql immutable set search_path = '' as $$
  select case p when 'premium' then 2000 when 'pro' then 700 when 'basic' then 200 else 0 end;
$$;

create or replace function public.plan_level(p text)
returns integer language sql immutable set search_path = '' as $$
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
create policy "Read own jobs" on public.ai_jobs for select using ((select auth.uid()) = user_id);

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
create policy "Read own credit events" on public.credit_events for select using ((select auth.uid()) = user_id);

-- One free try of each Basic and Pro tool per account.
create table if not exists public.tool_trials (
  user_id uuid not null references auth.users (id) on delete cascade,
  tool text not null check (tool ~ '^[a-z0-9-]{2,40}$'),
  used_at timestamptz not null default now(),
  primary key (user_id, tool)
);
alter table public.tool_trials enable row level security;
drop policy if exists "Read own trials" on public.tool_trials;
create policy "Read own trials" on public.tool_trials for select using ((select auth.uid()) = user_id);

-- Stripe webhook events already handled (so a retried event is applied once).
create table if not exists public.stripe_events (
  id text primary key,
  type text,
  created_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;

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
  with check (bucket_id = 'ai-inputs' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Read own AI outputs" on storage.objects;
create policy "Read own AI outputs" on storage.objects
  for select to authenticated
  using (bucket_id = 'ai-outputs' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- =========================================================== admin and visit counting
-- Admins: add yourself once (SQL Editor):
--   insert into public.admins (user_id) select id from auth.users where email = 'YOUR EMAIL';
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;
drop policy if exists "Read own admin row" on public.admins;
create policy "Read own admin row" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- Runs with the caller's own rights: it can only ever see the caller's own row.
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Daily counts of visits, pages and tool runs. No cookies, no IPs, no user IDs:
-- just "this page was viewed N times today".
create table if not exists public.daily_stats (
  day date not null default current_date,
  kind text not null check (kind in ('visit', 'view', 'tool')),
  key text not null,
  count integer not null default 0,
  primary key (day, kind, key)
);
alter table public.daily_stats enable row level security;
revoke all on public.daily_stats from anon, authenticated;

create or replace function public.track(p_kind text, p_key text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_kind not in ('visit', 'view', 'tool') or p_key is null or p_key !~ '^[a-z0-9/_-]{1,80}$' then
    return;
  end if;
  -- Keep the table small even if someone sends junk: at most 300 names per kind per day.
  if not exists (select 1 from public.daily_stats where day = current_date and kind = p_kind and key = p_key)
     and (select count(*) from public.daily_stats where day = current_date and kind = p_kind) >= 300 then
    return;
  end if;
  insert into public.daily_stats (day, kind, key, count)
  values (current_date, p_kind, p_key, 1)
  on conflict (day, kind, key) do update set count = public.daily_stats.count + 1;
end;
$$;
revoke all on function public.track(text, text) from public;
grant execute on function public.track(text, text) to anon, authenticated;

create or replace function public.require_admin()
returns void
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.require_admin() from public, anon, authenticated;

-- Headline numbers for the admin page.
create or replace function public.admin_overview()
returns json
language plpgsql
stable
security definer set search_path = public
as $$
declare
  r json;
begin
  perform public.require_admin();
  select json_build_object(
    'users', (select count(*) from public.profiles),
    'new_today', (select count(*) from public.profiles where created_at >= current_date),
    'new_7d', (select count(*) from public.profiles where created_at >= current_date - 6),
    'active_today', (
      select count(distinct u) from (
        select user_id u from public.history where created_at >= current_date
        union select user_id from public.ai_jobs where created_at >= current_date
      ) a),
    'visits_today', (select coalesce(sum(count), 0) from public.daily_stats where kind = 'visit' and day = current_date),
    'visits_7d', (select coalesce(sum(count), 0) from public.daily_stats where kind = 'visit' and day >= current_date - 6),
    'tool_runs_today', (select coalesce(sum(count), 0) from public.daily_stats where kind = 'tool' and day = current_date),
    'tool_runs_7d', (select coalesce(sum(count), 0) from public.daily_stats where kind = 'tool' and day >= current_date - 6),
    'ai_jobs_today', (select count(*) from public.ai_jobs where created_at >= current_date and status = 'succeeded'),
    'credits_today', (select coalesce(sum(credits), 0) from public.ai_jobs where created_at >= current_date and status = 'succeeded'),
    'plans', (select json_object_agg(plan, n) from (select plan, count(*) n from public.profiles group by plan) p),
    'waitlist', (select json_object_agg(plan_interest, n) from (select plan_interest, count(*) n from public.profiles where plan_interest is not null and plan = 'free' group by plan_interest) w),
    'paid', (select json_object_agg(k, n) from (select plan || '_' || coalesce(billing_interval, 'month') k, count(*) n from public.profiles where plan <> 'free' group by 1) x)
  ) into r;
  return r;
end;
$$;

-- One row per day: visits, page views, tool runs, sign-ups, active users, AI jobs.
create or replace function public.admin_daily(p_days integer default 30)
returns table (day date, visits bigint, views bigint, tool_runs bigint, signups bigint, active_users bigint, ai_jobs bigint)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  perform public.require_admin();
  return query
  select d::date,
    coalesce((select sum(s.count) from public.daily_stats s where s.day = d::date and s.kind = 'visit'), 0)::bigint,
    coalesce((select sum(s.count) from public.daily_stats s where s.day = d::date and s.kind = 'view'), 0)::bigint,
    coalesce((select sum(s.count) from public.daily_stats s where s.day = d::date and s.kind = 'tool'), 0)::bigint,
    (select count(*) from public.profiles p where p.created_at::date = d::date)::bigint,
    (select count(distinct u) from (
      select h.user_id u from public.history h where h.created_at::date = d::date
      union select j.user_id from public.ai_jobs j where j.created_at::date = d::date
    ) a)::bigint,
    (select count(*) from public.ai_jobs j where j.created_at::date = d::date and j.status = 'succeeded')::bigint
  from generate_series(current_date - (least(greatest(p_days, 1), 365) - 1), current_date, interval '1 day') d
  order by 1;
end;
$$;

-- Most-used tools over the last N days (everyone, signed in or not).
create or replace function public.admin_top_tools(p_days integer default 30)
returns table (tool text, uses bigint)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  perform public.require_admin();
  return query
  select s.key, sum(s.count)::bigint
  from public.daily_stats s
  where s.kind = 'tool' and s.day >= current_date - (least(greatest(p_days, 1), 365) - 1)
  group by s.key
  order by 2 desc
  limit 50;
end;
$$;

-- Most-viewed pages over the last N days.
create or replace function public.admin_top_pages(p_days integer default 30)
returns table (page text, views bigint)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  perform public.require_admin();
  return query
  select s.key, sum(s.count)::bigint
  from public.daily_stats s
  where s.kind = 'view' and s.day >= current_date - (least(greatest(p_days, 1), 365) - 1)
  group by s.key
  order by 2 desc
  limit 30;
end;
$$;

-- Where visitors came from (the site that linked to Readily, or "direct").
create or replace function public.admin_top_sources(p_days integer default 30)
returns table (source text, visits bigint)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  perform public.require_admin();
  return query
  select s.key, sum(s.count)::bigint
  from public.daily_stats s
  where s.kind = 'visit' and s.day >= current_date - (least(greatest(p_days, 1), 365) - 1)
  group by s.key
  order by 2 desc
  limit 20;
end;
$$;

-- Signed-up users with their plan, waitlist choice and recent use.
create or replace function public.admin_users(p_search text default '', p_filter text default 'all', p_limit integer default 50, p_offset integer default 0)
returns table (
  id uuid, email text, full_name text, plan text, plan_interest text, credits integer,
  created_at timestamptz, last_active timestamptz, uses_30d bigint, ai_jobs_30d bigint, total bigint
)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  perform public.require_admin();
  return query
  with base as (
    select p.id, u.email::text, p.full_name, p.plan, p.plan_interest, p.credits, p.created_at,
      greatest(
        (select max(h.created_at) from public.history h where h.user_id = p.id),
        (select max(j.created_at) from public.ai_jobs j where j.user_id = p.id),
        u.last_sign_in_at
      ) as last_active,
      (select count(*) from public.history h where h.user_id = p.id and h.created_at >= now() - interval '30 days') as uses_30d,
      (select count(*) from public.ai_jobs j where j.user_id = p.id and j.created_at >= now() - interval '30 days') as ai_jobs_30d
    from public.profiles p
    join auth.users u on u.id = p.id
    where (coalesce(p_search, '') = '' or u.email ilike '%' || p_search || '%' or p.full_name ilike '%' || p_search || '%')
      and (p_filter = 'all'
        or (p_filter = 'paid' and p.plan <> 'free')
        or (p_filter = 'waitlist' and p.plan_interest is not null and p.plan = 'free'))
  )
  select b.*, count(*) over () as total
  from base b
  order by b.created_at desc
  limit least(greatest(p_limit, 1), 500) offset greatest(p_offset, 0);
end;
$$;

revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_daily(integer) from public, anon;
revoke all on function public.admin_top_tools(integer) from public, anon;
revoke all on function public.admin_top_pages(integer) from public, anon;
revoke all on function public.admin_top_sources(integer) from public, anon;
revoke all on function public.admin_users(text, text, integer, integer) from public, anon;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_daily(integer) to authenticated;
grant execute on function public.admin_top_tools(integer) to authenticated;
grant execute on function public.admin_top_pages(integer) to authenticated;
grant execute on function public.admin_top_sources(integer) to authenticated;
grant execute on function public.admin_users(text, text, integer, integer) to authenticated;
