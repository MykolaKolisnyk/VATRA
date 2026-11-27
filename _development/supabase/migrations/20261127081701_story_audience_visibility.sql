-- Existing and older-client stories remain friends-only.
alter table public.stories
 add column visibility text not null default 'friends'
 constraint stories_visibility_check check (visibility in ('friends','public'));

-- Keep self access to archives, preserve expiry and friendship checks.
-- Existing restrictive block/account policies continue to apply.
alter policy story_read_access on public.stories
 to authenticated
 using (
   exists (select 1 from public.accounts a
     where a.vatra_id=stories.author_vatra_id and a.user_id=(select auth.uid()))
   or (
     expires_at>now()
     and (
       visibility='public'
       or exists (
         select 1 from public.friendships f
         join public.accounts me on me.vatra_id=f.recipient_id
         where me.user_id=(select auth.uid()) and f.status='accepted'
           and f.requester_id=stories.author_vatra_id
       )
       or exists (
         select 1 from public.friendships f
         join public.accounts me on me.vatra_id=f.requester_id
         where me.user_id=(select auth.uid()) and f.status='accepted'
           and f.recipient_id=stories.author_vatra_id
       )
     )
   )
 );
-- No grants to anon. Existing private media policies use the story row's RLS.
