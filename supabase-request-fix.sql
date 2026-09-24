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
