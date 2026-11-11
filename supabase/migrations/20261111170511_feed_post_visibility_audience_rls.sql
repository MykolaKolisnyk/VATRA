-- VATRA per-post audience enforced on the server (not merely in the UI).
-- Existing posts remain public to signed-in VATRA members.
alter table public.feed_posts
 add column if not exists visibility text not null default 'public';
alter table public.feed_posts
 drop constraint if exists feed_posts_visibility_check;
alter table public.feed_posts
 add constraint feed_posts_visibility_check
 check (visibility in ('public','friends','only_me'));
create index if not exists feed_posts_visibility_author_created_idx
 on public.feed_posts(author_vatra_id,visibility,created_at desc)
 where archived_at is null;
drop policy if exists "Read feed as signed-in member" on public.feed_posts;
drop policy if exists "Read own and audience feed posts" on public.feed_posts;
create policy "Read own and audience feed posts"
 on public.feed_posts for select to authenticated
 using (
  author_id=(select auth.uid()) or
  (
   archived_at is null and
   (
    visibility='public'
    or (
     visibility='friends' and exists (
      select 1
      from public.vatra_friendships f
      join public.accounts viewer on viewer.vatra_id in (f.requester_id,f.recipient_id)
      where viewer.user_id=(select auth.uid())
        and f.status='accepted'
        and (
         (f.requester_id=feed_posts.author_vatra_id and f.recipient_id=viewer.vatra_id)
         or
         (f.recipient_id=feed_posts.author_vatra_id and f.requester_id=viewer.vatra_id)
        )
     )
    )
   )
  )
 );
