-- VATRA / 2026-11-03: Require Latin a-z for newly created or CHANGED @handles.
-- Run in Supabase SQL Editor AFTER vatra-unique-handles-verification.sql.
-- Does NOT rename or delete existing users and does not force an unrelated
-- profile update to change an existing legacy (non-Latin) handle.
-- The frontend also validates the handle; this trigger is the backend guard.
begin;

create or replace function public.vatra_check_public_handle()
returns trigger
language plpgsql
set search_path = ''
as $vatra_latin_handle$
declare
  next_handle text;
  previous_handle text;
  handle_changed boolean;
begin
  if new.path ~ '^(publicProfiles|users)/[^/]+$' then
    next_handle := new.value ->> 'handle';
    if tg_op = 'INSERT' then
      handle_changed := true;
    else
      previous_handle := case
        when old.path = new.path then old.value ->> 'handle'
        else null
      end;
      handle_changed := (next_handle is distinct from previous_handle);
    end if;

    if handle_changed and (new.path ~ '^publicProfiles/[^/]+$' or next_handle is not null) then
      if next_handle is null or next_handle !~ '^[a-z][a-z0-9._-]{1,23}$'
         or next_handle ~ '[._-]$' then
        raise exception 'Invalid @handle: use 2-24 lowercase Latin letters a-z, digits, dots, underscores or hyphens; begin with a letter and end with a letter or digit'
          using errcode = '22023';
      end if;
    end if;
  end if;
  return new;
end;
$vatra_latin_handle$;

-- Reuse the existing guard name so every app_data write uses this validation.
drop trigger if exists vatra_public_handle_guard on public.app_data;
create trigger vatra_public_handle_guard
  before insert or update of value, path on public.app_data
  for each row
  execute function public.vatra_check_public_handle();

-- Availability check reports invalid for non-Latin aliases before DB writes.
create or replace function public.vatra_handle_availability(
  _handle text,
  _current_uid uuid default null
) returns jsonb
language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra_handle$
declare
  normalized text := lower(btrim(coalesce(_handle, '')));
  mine uuid := auth.uid();
  taken boolean;
begin
  if mine is null then
    return jsonb_build_object('status','unavailable');
  end if;
  if normalized !~ '^[a-z][a-z0-9._-]{1,23}$'
     or normalized ~ '[._-]$' then
    return jsonb_build_object('status','invalid');
  end if;
  select exists(
    select 1 from public.app_data a
    where a.path ~ '^publicProfiles/[^/]+$'
      and lower(btrim(a.value->>'handle')) = normalized
      and a.path <> 'publicProfiles/' || mine::text
  ) into taken;
  return jsonb_build_object('status', case when taken then 'taken' else 'available' end);
end;
$vatra_handle$;
revoke all on function public.vatra_handle_availability(text,uuid) from public,anon;
grant execute on function public.vatra_handle_availability(text,uuid) to authenticated;

commit;
