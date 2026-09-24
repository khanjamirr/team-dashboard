-- =====================================================================
-- Team Dashboard · Supabase setup (passcode login, one shared workbook)
-- Run once: Supabase Dashboard → SQL Editor → New query → paste all → Run.
-- Safe to run again.
--
-- How it works
--   * Everyone signs in with a passcode. The admin passcode gives admin rights
--     (manage passcodes, see sign-in and save history); user passcodes open the dashboard.
--   * The workbook is stored inside the database (table td_files). Nobody can read any
--     td_ table directly: every request goes through the functions below, which check
--     the passcode session first.
--   * Saves are refused if someone else saved since you loaded (no silent overwrites), unless the person
--     confirms "Overwrite" in the dashboard: then the save is forced (p_force) and still backed up first.
--   * Each passcode has its own rights (pages it can open, what it can change, who approves leave).
--     The admin sets them in Settings > People & access. Admins always have every right.
--   * Team-wide settings (for example which fields are mandatory) live in td_settings.
--
-- Upgrading from 3.10, 3.11 or 3.12: just run this whole file again. The first admin becomes the super admin. Existing passcodes keep working and keep full
-- (non-admin) rights until you change them in Settings.
--   * The first save of each day keeps a backup copy for 30 days (table td_file_backups).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- tables ----------
create table if not exists public.td_users (
  id          bigint generated always as identity primary key,
  name        text not null,
  passcode    text not null unique,
  role        text not null default 'user',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  last_login  timestamptz
);
alter table public.td_users add column if not exists permissions jsonb not null default '{}'::jsonb;
-- 3.13: three roles. The super admin has every right and is the only one who manages people and rights.
alter table public.td_users drop constraint if exists td_users_role_check;
alter table public.td_users add constraint td_users_role_check check (role in ('superadmin', 'admin', 'user'));
-- Upgrading: the first admin becomes the super admin (change it later in Settings > People & access).
update public.td_users set role = 'superadmin'
where id = (select min(id) from public.td_users where role = 'admin' and active)
  and not exists (select 1 from public.td_users where role = 'superadmin');
create table if not exists public.td_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);
create table if not exists public.td_sessions (
  token       text primary key,
  user_id     bigint not null references public.td_users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create table if not exists public.td_files (
  name        text primary key,
  data        bytea not null,
  version     integer not null default 1,
  size        integer not null default 0,
  updated_at  timestamptz not null default now(),
  updated_by  text
);
create table if not exists public.td_file_backups (
  id          bigint generated always as identity primary key,
  name        text not null,
  day         date not null,
  version     integer not null,
  data        bytea not null,
  created_at  timestamptz not null default now(),
  unique (name, day)
);
create table if not exists public.td_login_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  user_id     bigint,
  name        text,
  ok          boolean not null,
  ip          text
);
create table if not exists public.td_save_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  file        text not null,
  version     integer,
  size        integer,
  saved_by    text
);

-- Lock every table: no direct access for the public API keys. Only the functions below can touch them.
do $$ declare t text; begin
  foreach t in array array['td_users','td_sessions','td_files','td_file_backups','td_login_log','td_save_log','td_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ---------- helpers ----------
create or replace function public.td_client_ip() returns text
language sql stable as $$
  select coalesce(split_part(coalesce((current_setting('request.headers', true))::json ->> 'x-forwarded-for', ''), ',', 1), '')
$$;

-- Returns the signed-in user for a session token, or raises SESSION_EXPIRED.
create or replace function public.td_session_user(p_token text) returns public.td_users
language plpgsql security definer set search_path = public as $$
declare u public.td_users;
begin
  select usr.* into u
  from public.td_sessions s join public.td_users usr on usr.id = s.user_id
  where s.token = p_token and s.expires_at > now() and usr.active;
  if not found then raise exception 'SESSION_EXPIRED'; end if;
  update public.td_sessions set expires_at = now() + interval '12 hours'
  where token = p_token and expires_at < now() + interval '11 hours';   -- sliding 12-hour session
  return u;
end $$;

-- Only the super admin: people, passcodes and rights.
create or replace function public.td_require_admin(p_token text) returns public.td_users
language plpgsql security definer set search_path = public as $$
declare u public.td_users;
begin
  u := public.td_session_user(p_token);
  if u.role <> 'superadmin' then raise exception 'ADMIN_ONLY'; end if;
  return u;
end $$;

-- A right is on when the super admin ticked it (admins and users alike).
-- Passcodes whose rights were never set (no "_v" key) keep full rights, as before.
create or replace function public.td_can(u public.td_users, p_right text) returns boolean
language sql stable as $$
  select u.role = 'superadmin'
      or coalesce(u.permissions ->> '_v', '') = ''
      or coalesce((u.permissions ->> p_right)::boolean, false)
$$;

-- The super admin, or someone who was given this right.
create or replace function public.td_require_right(p_token text, p_right text) returns public.td_users
language plpgsql security definer set search_path = public as $$
declare u public.td_users;
begin
  u := public.td_session_user(p_token);
  if not public.td_can(u, p_right) then raise exception 'ADMIN_ONLY'; end if;
  return u;
end $$;
create or replace function public.td_can_write(u public.td_users) returns boolean
language sql stable as $$
  select public.td_can(u, 'emp.edit') or public.td_can(u, 'emp.add') or public.td_can(u, 'emp.delete') or public.td_can(u, 'emp.bulk')
      or public.td_can(u, 'att.log') or public.td_can(u, 'att.edit') or public.td_can(u, 'att.approve') or public.td_can(u, 'att.holidays')
$$;

-- ---------- sign in / out ----------
create or replace function public.td_login(p_passcode text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare u public.td_users; v_ip text := public.td_client_ip(); v_fails int; v_tok text;
begin
  select count(*) into v_fails from public.td_login_log l
  where not l.ok and l.ip = v_ip and l.at > now() - interval '10 minutes';
  if v_fails >= 10 then return json_build_object('error', 'TOO_MANY_ATTEMPTS'); end if;

  select * into u from public.td_users where passcode = trim(p_passcode) and active;
  if not found then
    -- recorded (not raised) so the attempt counts towards the 10-per-10-minutes limit
    insert into public.td_login_log (ok, ip) values (false, v_ip);
    perform pg_sleep(0.4);
    return json_build_object('error', 'WRONG_PASSCODE');
  end if;

  delete from public.td_sessions where expires_at < now();
  v_tok := encode(gen_random_bytes(32), 'hex');
  insert into public.td_sessions (token, user_id, expires_at) values (v_tok, u.id, now() + interval '12 hours');
  update public.td_users set last_login = now() where id = u.id;
  insert into public.td_login_log (user_id, name, ok, ip) values (u.id, u.name, true, v_ip);
  delete from public.td_login_log where at < now() - interval '30 days';
  return json_build_object('token', v_tok, 'name', u.name, 'role', u.role, 'user_id', u.id, 'permissions', u.permissions);
end $$;

create or replace function public.td_logout(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from public.td_sessions where token = p_token;
$$;

create or replace function public.td_me(p_token text) returns json
language plpgsql security definer set search_path = public as $$
declare u public.td_users;
begin
  u := public.td_session_user(p_token);
  return json_build_object('name', u.name, 'role', u.role, 'user_id', u.id, 'permissions', u.permissions);
end $$;

-- ---------- team settings ----------
create or replace function public.td_get_settings(p_token text) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform public.td_session_user(p_token);
  return coalesce((select json_object_agg(key, value) from public.td_settings), '{}'::json);
end $$;

create or replace function public.td_admin_set_setting(p_token text, p_key text, p_value jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare me public.td_users;
begin
  -- mandatory fields: anyone given that right; everything else: the super admin
  if p_key = 'required_fields' then me := public.td_require_right(p_token, 'set.fields'); else me := public.td_require_admin(p_token); end if;
  insert into public.td_settings (key, value, updated_at, updated_by) values (p_key, p_value, now(), me.name)
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = me.name;
end $$;

-- ---------- the workbook ----------
create or replace function public.td_file_info(p_token text, p_name text) returns json
language plpgsql security definer set search_path = public as $$
declare f record;
begin
  perform public.td_session_user(p_token);
  select version, size, updated_at, updated_by into f from public.td_files where name = p_name;
  if not found then return null; end if;
  return json_build_object('version', f.version, 'size', f.size, 'updated_at', f.updated_at, 'updated_by', f.updated_by);
end $$;

create or replace function public.td_get_file(p_token text, p_name text) returns json
language plpgsql security definer set search_path = public as $$
declare f public.td_files;
begin
  perform public.td_session_user(p_token);
  select * into f from public.td_files where name = p_name;
  if not found then raise exception 'FILE_NOT_FOUND'; end if;
  return json_build_object('data', replace(encode(f.data, 'base64'), E'\n', ''), 'version', f.version,
                           'size', f.size, 'updated_at', f.updated_at, 'updated_by', f.updated_by);
end $$;

-- Shared lists anyone with an editing right may change (not just the admin), e.g. people who need no client.
create or replace function public.td_set_shared_setting(p_token text, p_key text, p_value jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare u public.td_users;
begin
  u := public.td_session_user(p_token);
  if p_key not in ('client_not_needed') then raise exception 'ADMIN_ONLY'; end if;
  if not public.td_can_write(u) then raise exception 'READ_ONLY'; end if;
  insert into public.td_settings (key, value, updated_at, updated_by) values (p_key, p_value, now(), u.name)
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = u.name;
end $$;

-- p_base_version: the version you loaded (0 when creating the file). Raises CONFLICT if it moved on,
-- unless p_force is true (the person saw the conflict and chose Overwrite). A backup is kept either way.
drop function if exists public.td_put_file(text, text, text, integer);
create or replace function public.td_put_file(p_token text, p_name text, p_data text, p_base_version integer, p_force boolean default false) returns json
language plpgsql security definer set search_path = public as $$
declare u public.td_users; bytes bytea := decode(p_data, 'base64'); cur public.td_files; newv integer;
begin
  u := public.td_session_user(p_token);
  if not public.td_can_write(u) then raise exception 'READ_ONLY'; end if;
  if coalesce(p_base_version, 0) = 0 and not coalesce(p_force, false) then
    if u.role not in ('superadmin', 'admin') then raise exception 'ADMIN_ONLY'; end if;   -- only an admin sets up the workbook
    insert into public.td_files (name, data, version, size, updated_by)
    values (p_name, bytes, 1, length(bytes), u.name)
    on conflict (name) do nothing;
    if not found then raise exception 'CONFLICT'; end if;
    newv := 1;
  else
    select * into cur from public.td_files where name = p_name for update;
    if not found then raise exception 'FILE_NOT_FOUND'; end if;
    if cur.version <> p_base_version and not coalesce(p_force, false) then raise exception 'CONFLICT'; end if;
    insert into public.td_file_backups (name, day, version, data)
    values (p_name, current_date, cur.version, cur.data)
    on conflict (name, day) do nothing;                       -- first save of the day keeps yesterday's state
    delete from public.td_file_backups where day < current_date - 30;
    update public.td_files set data = bytes, version = cur.version + 1, size = length(bytes), updated_at = now(), updated_by = u.name
    where name = p_name returning version into newv;
  end if;
  insert into public.td_save_log (file, version, size, saved_by) values (p_name, newv, length(bytes), u.name);
  delete from public.td_save_log where at < now() - interval '30 days';
  return json_build_object('version', newv, 'updated_at', now());
end $$;

-- ---------- admin: passcodes ----------
create or replace function public.td_admin_list_users(p_token text) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform public.td_require_admin(p_token);
  return coalesce((select json_agg(json_build_object('id', id, 'name', name, 'passcode', passcode, 'role', role,
           'active', active, 'last_login', last_login, 'created_at', created_at, 'permissions', permissions) order by role, name)
         from public.td_users), '[]'::json);
end $$;

drop function if exists public.td_admin_save_user(text, bigint, text, text, text, boolean);
create or replace function public.td_admin_save_user(p_token text, p_id bigint, p_name text, p_passcode text, p_role text, p_active boolean, p_permissions jsonb default null) returns json
language plpgsql security definer set search_path = public as $$
declare me public.td_users; old public.td_users; pc text := trim(p_passcode); rid bigint; admins int;
begin
  me := public.td_require_admin(p_token);
  if coalesce(trim(p_name), '') = '' then raise exception 'NAME_REQUIRED'; end if;
  if length(pc) < 4 then raise exception 'PASSCODE_TOO_SHORT'; end if;
  if p_role not in ('superadmin', 'admin', 'user') then raise exception 'BAD_ROLE'; end if;
  if exists (select 1 from public.td_users where passcode = pc and id is distinct from p_id) then raise exception 'PASSCODE_TAKEN'; end if;
  if p_id is null then
    insert into public.td_users (name, passcode, role, active, permissions) values (trim(p_name), pc, p_role, coalesce(p_active, true), coalesce(p_permissions, '{}'::jsonb)) returning id into rid;
  else
    select * into old from public.td_users where id = p_id;
    if not found then raise exception 'USER_NOT_FOUND'; end if;
    if old.role = 'superadmin' and (p_role <> 'superadmin' or not coalesce(p_active, true)) then
      select count(*) into admins from public.td_users where role = 'superadmin' and active and id <> p_id;
      if admins = 0 then raise exception 'LAST_ADMIN'; end if;
    end if;
    update public.td_users set name = trim(p_name), passcode = pc, role = p_role, active = coalesce(p_active, true),
      permissions = coalesce(p_permissions, old.permissions) where id = p_id;
    if old.passcode <> pc or not coalesce(p_active, true) then
      delete from public.td_sessions where user_id = p_id and token <> p_token;   -- changed passcode signs them out elsewhere
    end if;
    rid := p_id;
  end if;
  return json_build_object('id', rid);
end $$;

create or replace function public.td_admin_delete_user(p_token text, p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare me public.td_users; old public.td_users; admins int;
begin
  me := public.td_require_admin(p_token);
  if me.id = p_id then raise exception 'CANNOT_DELETE_SELF'; end if;
  select * into old from public.td_users where id = p_id;
  if not found then return; end if;
  if old.role = 'superadmin' then
    select count(*) into admins from public.td_users where role = 'superadmin' and active and id <> p_id;
    if admins = 0 then raise exception 'LAST_ADMIN'; end if;
  end if;
  delete from public.td_users where id = p_id;
end $$;

create or replace function public.td_admin_history(p_token text) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform public.td_require_right(p_token, 'set.workbook');
  return json_build_object(
    'logins', coalesce((select json_agg(x) from (select at, name, ok, ip from public.td_login_log order by at desc limit 50) x), '[]'::json),
    'saves',  coalesce((select json_agg(x) from (select at, file, version, size, saved_by from public.td_save_log order by at desc limit 50) x), '[]'::json),
    'backups', coalesce((select json_agg(x) from (select name, day, version, length(data) as size from public.td_file_backups order by day desc limit 31) x), '[]'::json));
end $$;

-- Admin: download a daily backup (restore it by uploading it from the dashboard's admin panel).
create or replace function public.td_admin_get_backup(p_token text, p_name text, p_day date) returns json
language plpgsql security definer set search_path = public as $$
declare b public.td_file_backups;
begin
  perform public.td_require_right(p_token, 'set.workbook');
  select * into b from public.td_file_backups where name = p_name and day = p_day;
  if not found then raise exception 'FILE_NOT_FOUND'; end if;
  return json_build_object('data', replace(encode(b.data, 'base64'), E'\n', ''), 'version', b.version);
end $$;

-- ---------- who may call what ----------
do $$ declare f text; begin
  foreach f in array array[
    'td_client_ip()', 'td_session_user(text)', 'td_require_admin(text)',
    'td_can(public.td_users, text)', 'td_can_write(public.td_users)', 'td_require_right(text, text)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'td_login(text)', 'td_logout(text)', 'td_me(text)', 'td_file_info(text, text)', 'td_get_file(text, text)',
    'td_put_file(text, text, text, integer, boolean)', 'td_admin_list_users(text)', 'td_admin_save_user(text, bigint, text, text, text, boolean, jsonb)',
    'td_get_settings(text)', 'td_admin_set_setting(text, text, jsonb)', 'td_set_shared_setting(text, text, jsonb)',
    'td_admin_delete_user(text, bigint)', 'td_admin_history(text)', 'td_admin_get_backup(text, text, date)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

-- ---------- the first admin ----------
-- CHANGE THIS PASSCODE before running. After the first sign-in, manage every passcode from the dashboard.
insert into public.td_users (name, passcode, role)
select 'Admin', 'CHANGE-ME-2468', 'superadmin'
where not exists (select 1 from public.td_users where role = 'superadmin');

-- Team Dashboard 3.16.2 -- upgrade for an existing installation.
-- Run this entire file in Supabase SQL Editor before publishing index.html.
-- Preserves existing accounts, workbooks, permissions, and request history.
begin;

create or replace function public.td_save_leave_request(
  p_token text, p_request jsonb, p_expected jsonb default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  u public.td_users;
  items jsonb;
  old_request jsonb;
  saved jsonb;
  request_id text;
  status text;
  code text;
  day_text text;
  can_log boolean;
  at_time text := to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  u := public.td_session_user(p_token);
  if jsonb_typeof(p_request) is distinct from 'object' then raise exception 'BAD_REQUEST'; end if;
  request_id := p_request ->> 'id';
  status := p_request ->> 'status';
  code := p_request ->> 'code';
  if request_id is null or length(request_id) not between 1 and 100 then raise exception 'BAD_REQUEST'; end if;

  -- Create the shared row if necessary, then lock it for the full read/modify/write.
  insert into public.td_settings(key, value) values ('leave_requests', '[]'::jsonb)
  on conflict (key) do nothing;
  select value into items from public.td_settings where key = 'leave_requests' for update;
  if jsonb_typeof(items) is distinct from 'array' then raise exception 'INVALID_REQUEST_STORE'; end if;
  select value into old_request from jsonb_array_elements(items) where value ->> 'id' = request_id;

  if old_request is null then
    if p_expected is not null then raise exception 'REQUEST_CONFLICT'; end if;
    if status is distinct from 'pending' then raise exception 'BAD_REQUEST'; end if;
    can_log := public.td_can(u, 'att.log') or public.td_can(u, 'att.edit') or public.td_can(u, 'att.approve');
    if not can_log then raise exception 'READ_ONLY'; end if;
    if code is null or code not in ('LA','AL','CL','SL','UL','AB','HD1','HD2','R','L','C') then raise exception 'BAD_REQUEST'; end if;
    -- Match the dashboard's migration rules for pre-v5 leave-type permissions.
    if u.role <> 'superadmin' and coalesce(u.permissions ->> '_v', '') <> '' then
      if coalesce((u.permissions ->> '_v')::integer, 0) >= 5 then
        if not public.td_can(u, 'log.' || code) then raise exception 'READ_ONLY'; end if;
      elsif code in ('AL','CL','SL') then
        if not public.td_can(u, 'att.approve') then raise exception 'READ_ONLY'; end if;
      elsif code <> 'LA' and not public.td_can(u, 'att.edit') then raise exception 'READ_ONLY';
      end if;
    end if;
    if coalesce(btrim(p_request ->> 'name'), '') = '' or length(p_request ->> 'name') > 500 then raise exception 'BAD_REQUEST'; end if;
    if jsonb_typeof(p_request -> 'dates') is distinct from 'array' then raise exception 'BAD_REQUEST'; end if;
    if jsonb_array_length(p_request -> 'dates') not between 1 and 93 then raise exception 'BAD_REQUEST'; end if;
    if exists (select 1 from jsonb_array_elements(p_request -> 'dates') d where jsonb_typeof(d) <> 'string') then raise exception 'BAD_REQUEST'; end if;
    for day_text in select jsonb_array_elements_text(p_request -> 'dates') loop
      if day_text !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'BAD_REQUEST'; end if;
      perform day_text::date;
    end loop;
    if (select count(distinct d) from jsonb_array_elements_text(p_request -> 'dates') d) <> jsonb_array_length(p_request -> 'dates') then raise exception 'BAD_REQUEST'; end if;
    if (select max(d::date) - min(d::date) from jsonb_array_elements_text(p_request -> 'dates') d) > 92 then raise exception 'BAD_REQUEST'; end if;
    -- Build the record explicitly. Identity and timestamps never come from the browser.
    saved := jsonb_build_object(
      'id', request_id, 'status', 'pending', 'at', at_time,
      'by', u.name, 'byId', u.id::text,
      'name', btrim(p_request ->> 'name'), 'key', p_request ->> 'key',
      'empId', p_request -> 'empId', 'client', left(coalesce(p_request ->> 'client', ''), 500),
      'code', code, 'dates', p_request -> 'dates', 'note', left(coalesce(p_request ->> 'note', ''), 200));
    items := items || jsonb_build_array(saved);
  else
    -- Stale edits, replayed submissions and decided requests cannot be overwritten.
    if p_expected is null or old_request is distinct from p_expected then raise exception 'REQUEST_CONFLICT'; end if;
    if old_request ->> 'status' is distinct from 'pending' then raise exception 'REQUEST_CONFLICT'; end if;
    if status = 'cancelled' then
      if old_request ->> 'byId' is distinct from u.id::text then raise exception 'REQUEST_NOT_OWNER'; end if;
      saved := old_request || jsonb_build_object('status', status, 'decidedBy', u.name, 'decidedById', u.id::text, 'decidedAt', at_time);
    elsif status in ('approved','rejected') then
      if not public.td_can(u, 'att.approve') then raise exception 'ADMIN_ONLY'; end if;
      saved := old_request || jsonb_build_object('status', status, 'decidedBy', u.name, 'decidedById', u.id::text, 'decidedAt', at_time);
      if status = 'approved' then
        if code is null or code not in ('AL','CL','SL','UL','AB','HD1','HD2','R','L','C') then raise exception 'BAD_REQUEST'; end if;
        saved := saved || jsonb_build_object('code', code, 'asked', old_request ->> 'code');
        -- Informational only: the workbook write is a separate operation.
        -- The server cannot validate the content of the uploaded Excel workbook here.
        if p_request ->> 'trackerSavedAt' is not null then
          perform (p_request ->> 'trackerSavedAt')::timestamptz;
          saved := saved || jsonb_build_object('trackerSavedAt', p_request ->> 'trackerSavedAt');
        end if;
      else
        saved := saved || jsonb_build_object('reason', left(coalesce(p_request ->> 'reason', ''), 200));
      end if;
    else
      raise exception 'BAD_REQUEST';
    end if;
    select jsonb_agg(case when value ->> 'id' = request_id then saved else value end order by ordinality)
      into items from jsonb_array_elements(items) with ordinality;
  end if;
  update public.td_settings set value = items, updated_at = now(), updated_by = u.name where key = 'leave_requests';
  return saved;
end $$;

revoke all on function public.td_save_leave_request(text, jsonb, jsonb) from public;
grant execute on function public.td_save_leave_request(text, jsonb, jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
