-- Team Dashboard · Supabase setup
-- Run once in your Supabase project: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run again; it skips things that already exist.

-- 1. Private storage bucket that holds the two workbooks (and daily backups under backups/).
insert into storage.buckets (id, name, public)
values ('team-dashboard', 'team-dashboard', false)
on conflict (id) do nothing;

-- 2. Who may use the dashboard. Only emails listed here can read or save the files.
create table if not exists public.dashboard_members (
  email     text primary key,
  added_at  timestamptz not null default now()
);
alter table public.dashboard_members enable row level security;

drop policy if exists "members see themselves" on public.dashboard_members;
create policy "members see themselves" on public.dashboard_members
  for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

create or replace function public.is_dashboard_member()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dashboard_members m
    where lower(m.email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- 3. Storage rules: members can list, download, upload and overwrite files in the bucket.
--    Nobody can delete through the dashboard (there is no delete policy).
drop policy if exists "team-dashboard read"   on storage.objects;
drop policy if exists "team-dashboard insert" on storage.objects;
drop policy if exists "team-dashboard update" on storage.objects;

create policy "team-dashboard read" on storage.objects
  for select to authenticated
  using (bucket_id = 'team-dashboard' and public.is_dashboard_member());

create policy "team-dashboard insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'team-dashboard' and public.is_dashboard_member());

create policy "team-dashboard update" on storage.objects
  for update to authenticated
  using (bucket_id = 'team-dashboard' and public.is_dashboard_member())
  with check (bucket_id = 'team-dashboard' and public.is_dashboard_member());

-- 4. Save log: one row per save (which file, who, when).
create table if not exists public.save_log (
  id        bigint generated always as identity primary key,
  file      text not null,
  size      bigint,
  saved_by  text not null default (auth.jwt() ->> 'email'),
  saved_at  timestamptz not null default now()
);
alter table public.save_log enable row level security;

drop policy if exists "members add save log"  on public.save_log;
drop policy if exists "members read save log" on public.save_log;

create policy "members add save log" on public.save_log
  for insert to authenticated
  with check (public.is_dashboard_member());

create policy "members read save log" on public.save_log
  for select to authenticated
  using (public.is_dashboard_member());

-- 5. Add your team. Change these emails, then run just these lines again whenever someone joins.
insert into public.dashboard_members (email) values
  ('you@yourcompany.com')
  -- , ('colleague@yourcompany.com')
on conflict (email) do nothing;

-- To remove someone:
--   delete from public.dashboard_members where email = 'colleague@yourcompany.com';
-- To see who saved what:
--   select * from public.save_log order by saved_at desc limit 50;
