-- Extend avatar interactions to any existing image in the same owner's avatar gallery.
-- Existing restrictive block and active-account policies remain unchanged.
alter policy "members can like current avatars as themselves" on public.avatar_likes
with check (
 liker_id=(select auth.uid())
 and avatar_path ~ ('^'||owner_vatra_id::text||'/avatar/[A-Za-z0-9_-]+[.](jpg|jpeg|png|webp)$')
 and exists(select 1 from storage.objects o where o.bucket_id='avatars' and o.name=avatar_likes.avatar_path)
 and (
  exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=avatar_likes.owner_vatra_id)
  or coalesce((select p.profile_visibility from public.profile_preferences p where p.vatra_id=avatar_likes.owner_vatra_id),'public')='public'
  or exists(select 1 from public.friendships f join public.accounts a on a.user_id=(select auth.uid()) where f.status='accepted' and ((f.requester_id=a.vatra_id and f.recipient_id=avatar_likes.owner_vatra_id) or (f.recipient_id=a.vatra_id and f.requester_id=avatar_likes.owner_vatra_id)))
 )
);
alter policy "members can comment on current avatars as themselves" on public.avatar_comments
with check (
 author_id=(select auth.uid())
 and exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=avatar_comments.author_vatra_id)
 and avatar_path ~ ('^'||owner_vatra_id::text||'/avatar/[A-Za-z0-9_-]+[.](jpg|jpeg|png|webp)$')
 and exists(select 1 from storage.objects o where o.bucket_id='avatars' and o.name=avatar_comments.avatar_path)
 and (
  exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=avatar_comments.owner_vatra_id)
  or coalesce((select p.profile_visibility from public.profile_preferences p where p.vatra_id=avatar_comments.owner_vatra_id),'public')='public'
  or exists(select 1 from public.friendships f join public.accounts a on a.user_id=(select auth.uid()) where f.status='accepted' and ((f.requester_id=a.vatra_id and f.recipient_id=avatar_comments.owner_vatra_id) or (f.recipient_id=a.vatra_id and f.requester_id=avatar_comments.owner_vatra_id)))
 )
);
alter policy "members can like current avatars as themselves" on public.avatar_likes rename to "members can like gallery avatars as themselves";
alter policy "members can comment on current avatars as themselves" on public.avatar_comments rename to "members can comment on gallery avatars as themselves";
