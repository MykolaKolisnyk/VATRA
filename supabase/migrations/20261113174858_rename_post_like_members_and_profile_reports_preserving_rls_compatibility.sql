-- Applied to VATRA Supabase as 20261113174858, with no data loss.
-- Automatically updatable views keep cached old JS working; underlying RLS
-- evaluates each statement as the invoking user.
BEGIN;
ALTER TABLE public.vatra_post_like_members RENAME TO post_like_members;
ALTER TABLE public.vatra_profile_reports RENAME TO profile_reports;
CREATE OR REPLACE FUNCTION private.sync_public_post_liker()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare member_id bigint;
begin
 if tg_op='DELETE' then
  select a.vatra_id into member_id from public.accounts a where a.user_id=old.liker_id;
  if member_id is not null then
   delete from public.post_like_members
   where post_kind=old.post_kind and post_id=old.post_id and liker_vatra_id=member_id;
  end if;
  return old;
 end if;
 select a.vatra_id into member_id from public.accounts a where a.user_id=new.liker_id;
 if member_id is not null then
  insert into public.post_like_members(post_kind,post_id,liker_vatra_id,liked_at)
  values(new.post_kind,new.post_id,member_id,new.created_at)
  on conflict(post_kind,post_id,liker_vatra_id)
  do update set liked_at=excluded.liked_at;
 end if;
 return new;
end $function$;
CREATE VIEW public.vatra_post_like_members WITH (security_invoker = true) AS
 SELECT post_kind,post_id,liker_vatra_id,liked_at FROM public.post_like_members;
CREATE VIEW public.vatra_profile_reports WITH (security_invoker = true) AS
 SELECT id,reporter_user_id,target_vatra_id,category,reason,details,created_at
 FROM public.profile_reports;
REVOKE ALL ON TABLE public.vatra_post_like_members,public.vatra_profile_reports
 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.vatra_post_like_members TO authenticated;
GRANT INSERT ON TABLE public.vatra_profile_reports TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
