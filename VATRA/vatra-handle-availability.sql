begin;

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
  if length(normalized) not between 2 and 24 or normalized !~ '^[[:alnum:]_.-]+$'
     or normalized ~ '^\.|\.$' then
    return jsonb_build_object('status','invalid');
  end if;
  -- Never trust a caller-provided UID. Only skip the calling account.
  select exists(
    select 1 from public.app_data a
    where a.path ~ '^publicProfiles/[^/]+$'
      and lower(btrim(a.value->>'handle')) = normalized
      and a.path <> 'publicProfiles/' || mine::text
  ) into taken;
  return jsonb_build_object('status',case when taken then 'taken' else 'available' end);
end;
$vatra_handle$;

revoke all on function public.vatra_handle_availability(text,uuid) from public,anon;
grant execute on function public.vatra_handle_availability(text,uuid) to authenticated;

-- Index is the final atomic guarantee: two concurrent saves cannot share a handle.
-- If duplicate publicProfiles exist already, fix those conflicts before installing
-- VATRA/vatra-unique-handles-verification.sql.
commit;
