-- VATRA profile status and activity (additive, no changes to registration).
-- Apply after review, before deploying the matching frontend.
alter table public.vatra_public_profiles
  add column if not exists status_text text;
alter table public.vatra_public_profiles
  drop constraint if exists vatra_public_profiles_status_length;
alter table public.vatra_public_profiles
  add constraint vatra_public_profiles_status_length
  check (status_text is null or char_length(status_text) <= 140);

-- The existing RLS SELECT policy stays in place.
-- Only this new column may be updated by the profile owner.
grant update (status_text) on public.vatra_public_profiles to authenticated;
drop policy if exists public_profile_update_own_status on public.vatra_public_profiles;
create policy public_profile_update_own_status
  on public.vatra_public_profiles for update to authenticated
  using (exists (
    select 1 from public.accounts a
    where a.vatra_id = vatra_public_profiles.vatra_id
      and a.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.accounts a
    where a.vatra_id = vatra_public_profiles.vatra_id
      and a.user_id = (select auth.uid())
  ));

-- Activity is public only to signed-in VATRA members.
-- The grammatical display form does not expose the private signup gender field.
create table if not exists public.vatra_member_presence (
  vatra_id bigint primary key references public.vatra_directory(vatra_id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  form text not null default 'neutral'
    check (form in ('masculine', 'feminine', 'neutral'))
);
alter table public.vatra_member_presence enable row level security;
revoke all on public.vatra_member_presence from public, anon, authenticated;
grant select on public.vatra_member_presence to authenticated;
grant insert (vatra_id, form) on public.vatra_member_presence to authenticated;
grant update (last_seen_at, form) on public.vatra_member_presence to authenticated;

drop policy if exists member_presence_read on public.vatra_member_presence;
create policy member_presence_read on public.vatra_member_presence
  for select to authenticated using (true);
drop policy if exists member_presence_insert_self on public.vatra_member_presence;
create policy member_presence_insert_self on public.vatra_member_presence
  for insert to authenticated
  with check (exists (select 1 from public.accounts a
    where a.vatra_id = vatra_member_presence.vatra_id
      and a.user_id = (select auth.uid())));
drop policy if exists member_presence_update_self on public.vatra_member_presence;
create policy member_presence_update_self on public.vatra_member_presence
  for update to authenticated
  using (exists (select 1 from public.accounts a
    where a.vatra_id = vatra_member_presence.vatra_id
      and a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.accounts a
    where a.vatra_id = vatra_member_presence.vatra_id
      and a.user_id = (select auth.uid())));

-- Server time wins even if a client attempts to send a forged timestamp.
create or replace function private.stamp_vatra_member_presence()
returns trigger language plpgsql
set search_path = ''
as $fn$
begin
  new.last_seen_at := now();
  return new;
end;
$fn$;
drop trigger if exists stamp_vatra_member_presence on public.vatra_member_presence;
create trigger stamp_vatra_member_presence
  before insert or update on public.vatra_member_presence
  for each row execute function private.stamp_vatra_member_presence();

comment on table public.vatra_member_presence is
  'Heartbeat from visible signed-in sessions; only members can read, each member writes their own activity.';
