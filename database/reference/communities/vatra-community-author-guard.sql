-- VATRA: publish community posts in the name of a community only by its creator or administrators.
-- Apply once in Supabase SQL Editor, in addition to the existing app-data-schema.sql deployment.
-- This does not disable or broaden RLS. It protects rows even when clients bypass the UI.
create or replace function public.vatra_validate_group_post_author()
returns trigger
language plpgsql security definer
set search_path = '' set row_security = off
as $vatra$
declare
  group_id text;
  viewer_id text;
begin
  if new.path !~ '^groupPosts/[^/]+/[^/]+$' then return new; end if;
  if coalesce(new.value ->> 'authorType','user') <> 'group' then return new; end if;
  group_id := split_part(new.path,'/',2);
  viewer_id := auth.uid()::text;
  if viewer_id is null or new.value ->> 'authorUid' is distinct from viewer_id then
    raise exception 'Only the signed-in author may publish this community post.';
  end if;
  if not exists (
    select 1 from public.app_data g
    where g.path = 'groups/' || group_id and g.value ->> 'ownerUid' = viewer_id
  ) and not exists (
    select 1 from public.app_data a
    where a.path = 'groupAdmins/' || group_id || '/' || viewer_id
      and a.value = 'true'::jsonb
  ) then
    raise exception 'Only a community creator or administrator may publish as the community.';
  end if;
  return new;
end;
$vatra$;
drop trigger if exists vatra_validate_group_post_author on public.app_data;
create trigger vatra_validate_group_post_author
before insert or update on public.app_data
for each row execute function public.vatra_validate_group_post_author();
