begin;
alter table public.community_posts add column guest_visible boolean not null default false;
alter table public.community_posts add constraint community_posts_guest_text_only check (not guest_visible or (length(btrim(coalesce(body,'')))>0 and media_kind is null and media_path is null and coalesce(media_items,'[]'::jsonb)='[]'::jsonb));
create index community_posts_guest_page_idx on public.community_posts (club_id,created_at desc,id desc) where guest_visible;
create schema if not exists vatra_guest_private;
revoke all on schema vatra_guest_private from public;
grant usage on schema vatra_guest_private to anon;
create function vatra_guest_private.active_member(member_id bigint) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is null and exists(select 1 from public.member_directory d where d.vatra_id=member_id) and not exists(select 1 from public.account_states s where s.vatra_id=member_id)
$$;
create function vatra_guest_private.public_name(member_id bigint) returns boolean language sql stable security definer set search_path='' as $$
 select vatra_guest_private.active_member(member_id) and exists(select 1 from public.profile_preferences p where p.vatra_id=member_id and p.profile_visibility='public')
$$;
revoke all on function vatra_guest_private.active_member(bigint) from public, authenticated;
revoke all on function vatra_guest_private.public_name(bigint) from public, authenticated;
grant execute on function vatra_guest_private.active_member(bigint), vatra_guest_private.public_name(bigint) to anon;
grant select (vatra_id,display_name) on public.public_profiles to anon;
create policy guest_public_profile_name on public.public_profiles for select to anon using (vatra_guest_private.public_name(vatra_id));
grant select (id,club_id,body,created_at,guest_visible) on public.community_posts to anon;
create policy guest_read_explicit_public_text on public.community_posts for select to anon using (guest_visible and vatra_guest_private.active_member(author_vatra_id));
commit;