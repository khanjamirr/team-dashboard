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
--   * Saves are refused if someone else saved since you loaded (no silent overwrites).
--   * The first save of each day keeps a backup copy for 30 days (table td_file_backups).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- tables ----------
create table if not exists public.td_users (
  id          bigint generated always as identity primary key,
  name        text not null,
  passcode    text not null unique,
  role        text not null default 'user' check (role in ('admin', 'user')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  last_login  timestamptz
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
  foreach t in array array['td_users','td_sessions','td_files','td_file_backups','td_login_log','td_save_log'] loop
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

create or replace function public.td_require_admin(p_token text) returns public.td_users
language plpgsql security definer set search_path = public as $$
declare u public.td_users;
begin
  u := public.td_session_user(p_token);
  if u.role <> 'admin' then raise exception 'ADMIN_ONLY'; end if;
  return u;
end $$;

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
  return json_build_object('token', v_tok, 'name', u.name, 'role', u.role, 'user_id', u.id);
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
  return json_build_object('name', u.name, 'role', u.role, 'user_id', u.id);
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

-- p_base_version: the version you loaded (0 when creating the file). Raises CONFLICT if it moved on.
create or replace function public.td_put_file(p_token text, p_name text, p_data text, p_base_version integer) returns json
language plpgsql security definer set search_path = public as $$
declare u public.td_users; bytes bytea := decode(p_data, 'base64'); cur public.td_files; newv integer;
begin
  u := public.td_session_user(p_token);
  if coalesce(p_base_version, 0) = 0 then
    if u.role <> 'admin' then raise exception 'ADMIN_ONLY'; end if;   -- only the admin sets up the workbook
    insert into public.td_files (name, data, version, size, updated_by)
    values (p_name, bytes, 1, length(bytes), u.name)
    on conflict (name) do nothing;
    if not found then raise exception 'CONFLICT'; end if;
    newv := 1;
  else
    select * into cur from public.td_files where name = p_name for update;
    if not found or cur.version <> p_base_version then raise exception 'CONFLICT'; end if;
    insert into public.td_file_backups (name, day, version, data)
    values (p_name, current_date, cur.version, cur.data)
    on conflict (name, day) do nothing;                       -- first save of the day keeps yesterday's state
    delete from public.td_file_backups where day < current_date - 30;
    update public.td_files set data = bytes, version = cur.version + 1, size = length(bytes), updated_at = now(), updated_by = u.name
    where name = p_name returning version into newv;
  end if;
  insert into public.td_save_log (file, version, size, saved_by) values (p_name, newv, length(bytes), u.name);
  return json_build_object('version', newv, 'updated_at', now());
end $$;

-- ---------- admin: passcodes ----------
create or replace function public.td_admin_list_users(p_token text) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform public.td_require_admin(p_token);
  return coalesce((select json_agg(json_build_object('id', id, 'name', name, 'passcode', passcode, 'role', role,
           'active', active, 'last_login', last_login, 'created_at', created_at) order by role, name)
         from public.td_users), '[]'::json);
end $$;

create or replace function public.td_admin_save_user(p_token text, p_id bigint, p_name text, p_passcode text, p_role text, p_active boolean) returns json
language plpgsql security definer set search_path = public as $$
declare me public.td_users; old public.td_users; pc text := trim(p_passcode); rid bigint; admins int;
begin
  me := public.td_require_admin(p_token);
  if coalesce(trim(p_name), '') = '' then raise exception 'NAME_REQUIRED'; end if;
  if length(pc) < 4 then raise exception 'PASSCODE_TOO_SHORT'; end if;
  if p_role not in ('admin', 'user') then raise exception 'BAD_ROLE'; end if;
  if exists (select 1 from public.td_users where passcode = pc and id is distinct from p_id) then raise exception 'PASSCODE_TAKEN'; end if;
  if p_id is null then
    insert into public.td_users (name, passcode, role, active) values (trim(p_name), pc, p_role, coalesce(p_active, true)) returning id into rid;
  else
    select * into old from public.td_users where id = p_id;
    if not found then raise exception 'USER_NOT_FOUND'; end if;
    if old.role = 'admin' and (p_role <> 'admin' or not coalesce(p_active, true)) then
      select count(*) into admins from public.td_users where role = 'admin' and active and id <> p_id;
      if admins = 0 then raise exception 'LAST_ADMIN'; end if;
    end if;
    update public.td_users set name = trim(p_name), passcode = pc, role = p_role, active = coalesce(p_active, true) where id = p_id;
    if old.passcode <> pc or not coalesce(p_active, true) or old.role <> p_role then
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
  if old.role = 'admin' then
    select count(*) into admins from public.td_users where role = 'admin' and active and id <> p_id;
    if admins = 0 then raise exception 'LAST_ADMIN'; end if;
  end if;
  delete from public.td_users where id = p_id;
end $$;

create or replace function public.td_admin_history(p_token text) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform public.td_require_admin(p_token);
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
  perform public.td_require_admin(p_token);
  select * into b from public.td_file_backups where name = p_name and day = p_day;
  if not found then raise exception 'FILE_NOT_FOUND'; end if;
  return json_build_object('data', replace(encode(b.data, 'base64'), E'\n', ''), 'version', b.version);
end $$;

-- ---------- who may call what ----------
do $$ declare f text; begin
  foreach f in array array[
    'td_client_ip()', 'td_session_user(text)', 'td_require_admin(text)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'td_login(text)', 'td_logout(text)', 'td_me(text)', 'td_file_info(text, text)', 'td_get_file(text, text)',
    'td_put_file(text, text, text, integer)', 'td_admin_list_users(text)', 'td_admin_save_user(text, bigint, text, text, text, boolean)',
    'td_admin_delete_user(text, bigint)', 'td_admin_history(text)', 'td_admin_get_backup(text, text, date)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

-- ---------- the first admin ----------
-- CHANGE THIS PASSCODE before running. After the first sign-in, manage every passcode from the dashboard.
insert into public.td_users (name, passcode, role)
select 'Admin', 'CHANGE-ME-2468', 'admin'
where not exists (select 1 from public.td_users where role = 'admin');
