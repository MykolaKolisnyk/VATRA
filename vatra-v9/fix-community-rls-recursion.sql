-- ВАТРА: fix infinite recursion between communities and community_members RLS.
-- Run this patch once in Supabase SQL Editor. It does not delete any rows.
-- Older existing databases may not have visibility on communities; add it before policies.
alter table public.communities add column if not exists visibility text not null default 'public';

create or replace function public.vatra_is_current_community_member(_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $vatra$
  select exists (
    select 1
    from public.community_members cm
    where cm.community_id = _community_id
      and cm.user_id = auth.uid()
      and cm.status = 'accepted'
  );
$vatra$;

create or replace function public.vatra_is_current_community_owner(_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $vatra$
  select exists (
    select 1
    from public.communities c
    where c.id = _community_id
      and c.owner_id = auth.uid()
  );
$vatra$;

create or replace function public.vatra_can_join_community(_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $vatra$
  select exists (
    select 1
    from public.communities c
    where c.id = _community_id
      and (c.visibility = 'public' or c.owner_id = auth.uid())
  );
$vatra$;

-- Make sure the helpers execute with a role that can read past RLS policies.
alter function public.vatra_is_current_community_member(uuid) owner to postgres;
alter function public.vatra_is_current_community_owner(uuid) owner to postgres;
alter function public.vatra_can_join_community(uuid) owner to postgres;
grant execute on function public.vatra_is_current_community_member(uuid) to anon, authenticated;
grant execute on function public.vatra_is_current_community_owner(uuid) to anon, authenticated;
grant execute on function public.vatra_can_join_community(uuid) to authenticated;

-- Drop every existing policy for these two tables so stale recursive rules cannot remain.
do $vatra$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('communities', 'community_members')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end;
$vatra$;

alter table public.communities enable row level security;
alter table public.community_members enable row level security;

-- A community can be seen if it is public, owned by the current user, or the user is an accepted member.
create policy communities_read
on public.communities for select
using (
  visibility = 'public'
  or owner_id = auth.uid()
  or public.vatra_is_current_community_member(id)
);

create policy communities_insert
on public.communities for insert to authenticated
with check (owner_id = auth.uid());

create policy communities_update
on public.communities for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy communities_delete
on public.communities for delete to authenticated
using (owner_id = auth.uid());

-- Membership policies use definer helpers instead of querying each other through RLS.
create policy community_members_read
on public.community_members for select to authenticated
using (
  user_id = auth.uid()
  or public.vatra_is_current_community_owner(community_id)
);

create policy community_members_insert
on public.community_members for insert to authenticated
with check (
  user_id = auth.uid()
  and public.vatra_can_join_community(community_id)
);

-- Only the community owner can change member roles/statuses (prevents self-promotion).
create policy community_members_owner_update
on public.community_members for update to authenticated
using (public.vatra_is_current_community_owner(community_id))
with check (public.vatra_is_current_community_owner(community_id));

create policy community_members_delete
on public.community_members for delete to authenticated
using (
  user_id = auth.uid()
  or public.vatra_is_current_community_owner(community_id)
);
