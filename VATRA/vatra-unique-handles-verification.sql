-- VATRA / 2026-10-31: unique @handles and owner-stable verified marks.
-- Apply in Supabase SQL Editor (postgres role), after app-data-schema.sql.
-- No existing user or verification data is deleted.
begin;

-- Detect legacy duplicates instead of silently taking someone else's @handle.
do $check$
declare duplicate_handle text;
begin
  select lower(btrim(value ->> 'handle')) into duplicate_handle
  from public.app_data
  where path ~ '^publicProfiles/[^/]+$'
    and length(btrim(coalesce(value ->> 'handle',''))) > 0
  group by lower(btrim(value ->> 'handle'))
  having count(*) > 1
  limit 1;
  if duplicate_handle is not null then
    raise exception 'Duplicate existing @handle: %. Resolve the conflicting publicProfiles values first; no data was changed.', duplicate_handle;
  end if;
end
$check$;

-- Database-level uniqueness, case-insensitive, across ALL existing accounts.
create unique index if not exists vatra_public_handle_unique
  on public.app_data ((lower(btrim(value ->> 'handle'))))
  where path ~ '^publicProfiles/[^/]+$'
    and length(btrim(coalesce(value ->> 'handle',''))) > 0;

-- Reject malformed and empty handles at the database boundary.
create or replace function public.vatra_check_public_handle()
returns trigger language plpgsql set search_path = ''
as $fn$
begin
  if new.path ~ '^publicProfiles/[^/]+$' then
    if length(btrim(coalesce(new.value ->> 'handle',''))) < 2
      or length(btrim(new.value ->> 'handle')) > 24
      or (new.value ->> 'handle') !~ '^[[:alnum:]_.-]+$' then
      raise exception 'Invalid @handle: use 2-24 letters, digits, dots, hyphens or underscores';
    end if;
  end if;
  return new;
end
$fn$;

drop trigger if exists vatra_public_handle_guard on public.app_data;
create trigger vatra_public_handle_guard
before insert or update of value, path on public.app_data
for each row execute function public.vatra_check_public_handle();

-- Admins cannot be self-declared via the old admins/<own UID> app_data path.
-- Restrictive RLS applies in addition to every permissive policy in app-data-schema.sql.
drop policy if exists vatra_restrict_privileged_insert on public.app_data;
drop policy if exists vatra_restrict_privileged_update on public.app_data;
drop policy if exists vatra_restrict_privileged_delete on public.app_data;
create policy vatra_restrict_privileged_insert on public.app_data
as restrictive for insert to authenticated
with check (path !~ '^(admins|verifiedUsers)/[^/]+$');
create policy vatra_restrict_privileged_update on public.app_data
as restrictive for update to authenticated
using (path !~ '^(admins|verifiedUsers)/[^/]+$')
with check (path !~ '^(admins|verifiedUsers)/[^/]+$');
create policy vatra_restrict_privileged_delete on public.app_data
as restrictive for delete to authenticated
using (path !~ '^(admins|verifiedUsers)/[^/]+$');

-- Administrators must be enrolled explicitly from the SQL Editor.
create table if not exists public.vatra_verification_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);
alter table public.vatra_verification_admins enable row level security;
revoke all on public.vatra_verification_admins from anon, authenticated;
-- Never add an INSERT/UPDATE policy allowing users to make themselves admins.

-- Used only to decide whether to display the admin verification panel.
create or replace function public.vatra_is_verification_admin()
returns boolean language sql stable security definer
set search_path = '' set row_security = off
as $fn$
  select auth.uid() is not null and exists (
    select 1 from public.vatra_verification_admins a where a.user_id = auth.uid()
  );
$fn$;
revoke all on function public.vatra_is_verification_admin() from public, anon;
grant execute on function public.vatra_is_verification_admin() to authenticated;

create or replace function public.vatra_set_verification_by_handle(
  _handle text, _verified boolean default true
)
returns table(user_id uuid, handle text, verified boolean)
language plpgsql security definer
set search_path = '' set row_security = off
as $fn$
declare target_id uuid; normalized text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.vatra_verification_admins a where a.user_id = auth.uid()
  ) then
    raise exception 'Only authorized VATRA verification administrators can do this.';
  end if;
  normalized := lower(btrim(regexp_replace(coalesce(_handle,''), '^@', '')));
  if length(normalized) < 2 then raise exception 'Enter a valid @handle.'; end if;
  select split_part(p.path,'/',2)::uuid into target_id
  from public.app_data p
  where p.path ~ '^publicProfiles/[0-9a-fA-F-]{36}$'
    and lower(btrim(p.value ->> 'handle')) = normalized
  limit 1;
  if target_id is null then raise exception 'Account @% not found.', normalized; end if;

  -- Permanent verification key is a user UUID; a future @handle change cannot move it.
  insert into public.app_data(path,value,updated_at)
  values (
    'verifiedUsers/' || target_id::text,
    jsonb_build_object(
      'verified',_verified,
      'updatedAt',floor(extract(epoch from now()) * 1000)::bigint,
      'updatedBy',auth.uid()::text
    ),
    now()
  )
  on conflict (path) do update
    set value=excluded.value,updated_at=now();
  return query select target_id,normalized,_verified;
end
$fn$;

revoke all on function public.vatra_set_verification_by_handle(text,boolean) from public,anon;
grant execute on function public.vatra_set_verification_by_handle(text,boolean) to authenticated;
commit;

-- FIRST: find your auth.users.id in Supabase Authentication -> Users.
-- SECOND: execute once in SQL Editor (replace UUID with yours):
-- insert into public.vatra_verification_admins(user_id)
-- values ('00000000-0000-0000-0000-000000000000') on conflict do nothing;
--
-- Give an official blue check by @handle, as the authorized account:
-- select * from public.vatra_set_verification_by_handle('example.handle', true);
-- Revoke by the CURRENT @handle:
-- select * from public.vatra_set_verification_by_handle('example.handle', false);
--
-- Prefer calling the RPC as the logged-in administrator client.
-- SQL Editor with postgres rights can directly upsert verifiedUsers/<UID>,
-- but the RPC is safer for regular administrator actions.