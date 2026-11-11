-- VATRA: editable profile information, per-field audiences and private-page access.
-- Do not store auth credentials, private e-mail or authorization identifiers in these tables.
create table if not exists public.vatra_profile_preferences (
 vatra_id bigint primary key references public.accounts(vatra_id) on delete cascade,
 profile_visibility text not null default 'public'
   constraint vatra_profile_visibility_check check (profile_visibility in ('public','friends')),
 updated_at timestamptz not null default now()
);
alter table public.vatra_profile_preferences enable row level security;
revoke all on public.vatra_profile_preferences from anon,authenticated;
grant select,insert,update on public.vatra_profile_preferences to authenticated;
drop policy if exists "profile_preferences_read" on public.vatra_profile_preferences;
create policy "profile_preferences_read" on public.vatra_profile_preferences
 for select to authenticated using (true);
drop policy if exists "profile_preferences_insert_owner" on public.vatra_profile_preferences;
create policy "profile_preferences_insert_owner" on public.vatra_profile_preferences
 for insert to authenticated with check (exists (
 select 1 from public.accounts a where a.vatra_id=vatra_id
 and a.user_id=(select auth.uid())
));
drop policy if exists "profile_preferences_update_owner" on public.vatra_profile_preferences;
create policy "profile_preferences_update_owner" on public.vatra_profile_preferences
 for update to authenticated using (exists (
 select 1 from public.accounts a where a.vatra_id=vatra_id
 and a.user_id=(select auth.uid())
))
 with check (exists (
 select 1 from public.accounts a where a.vatra_id=vatra_id
 and a.user_id=(select auth.uid())
));

create table if not exists public.vatra_profile_details (
 vatra_id bigint not null references public.accounts(vatra_id) on delete cascade,
 field_key text not null check (field_key in ('short_bio','relationship','hometown','languages','family','city','address','mobile_phone','additional_phone','website','activities','hobbies','favorite_music','favorite_movies','favorite_tv','favorite_books','favorite_games','favorite_quotes','about_me','school','university','education_extra','workplace','job_title','career_extra','military_service','political_views','worldview','life_priorities','important_in_people','attitude_to_smoking','attitude_to_alcohol','inspiration')),
 field_value text not null check (char_length(field_value) between 1 and 1000),
 visibility text not null default 'friends'
   constraint vatra_profile_detail_visibility_check check(visibility in ('public','friends','only_me')),
 updated_at timestamptz not null default now(),
 primary key(vatra_id,field_key)
);
create index if not exists vatra_profile_details_visibility_idx
 on public.vatra_profile_details(vatra_id,visibility);
alter table public.vatra_profile_details enable row level security;
revoke all on public.vatra_profile_details from anon,authenticated;
grant select,insert,update,delete on public.vatra_profile_details to authenticated;
drop policy if exists "profile_details_audience_read" on public.vatra_profile_details;
create policy "profile_details_audience_read" on public.vatra_profile_details
 for select to authenticated using (
 exists (
 select 1 from public.accounts a where a.vatra_id=vatra_id
 and a.user_id=(select auth.uid())
) or
 (
   (visibility='public' or (visibility='friends' and exists (
 select 1 from public.vatra_friendships f
 join public.accounts viewer on viewer.vatra_id in (f.requester_id,f.recipient_id)
 where viewer.user_id=(select auth.uid()) and f.status='accepted'
 and ((f.requester_id=vatra_id and f.recipient_id=viewer.vatra_id)
 or (f.recipient_id=vatra_id and f.requester_id=viewer.vatra_id))
)))
   and (coalesce((
 select pref.profile_visibility from public.vatra_profile_preferences pref
 where pref.vatra_id=vatra_id
),'public')='public' or exists (
 select 1 from public.vatra_friendships f
 join public.accounts viewer on viewer.vatra_id in (f.requester_id,f.recipient_id)
 where viewer.user_id=(select auth.uid()) and f.status='accepted'
 and ((f.requester_id=vatra_id and f.recipient_id=viewer.vatra_id)
 or (f.recipient_id=vatra_id and f.requester_id=viewer.vatra_id))
))
 )
);
drop policy if exists "profile_details_insert_owner" on public.vatra_profile_details;
create policy "profile_details_insert_owner" on public.vatra_profile_details
 for insert to authenticated with check (exists (
 select 1 from public.accounts a where a.vatra_id=vatra_id
 and a.user_id=(select auth.uid())
));
drop policy if exists "profile_details_update_owner" on public.vatra_profile_details;
create policy "profile_details_update_owner" on public.vatra_profile_details
 for update to authenticated using (exists (
 select 1 from public.accounts a where a.vatra_id=vatra_id
 and a.user_id=(select auth.uid())
))
 with check (exists (
 select 1 from public.accounts a where a.vatra_id=vatra_id
 and a.user_id=(select auth.uid())
));
drop policy if exists "profile_details_delete_owner" on public.vatra_profile_details;
create policy "profile_details_delete_owner" on public.vatra_profile_details
 for delete to authenticated using (exists (
 select 1 from public.accounts a where a.vatra_id=vatra_id
 and a.user_id=(select auth.uid())
));

-- Restrictive policies compose with existing audience/owner RLS and cannot widen access.
drop policy if exists "closed_profile_posts_gate" on public.feed_posts;
create policy "closed_profile_posts_gate" on public.feed_posts
 as restrictive for select to authenticated using ((exists (
 select 1 from public.accounts a where a.vatra_id=author_vatra_id
 and a.user_id=(select auth.uid())
) or coalesce((
 select pref.profile_visibility from public.vatra_profile_preferences pref
 where pref.vatra_id=author_vatra_id
),'public')='public' or exists (
 select 1 from public.vatra_friendships f
 join public.accounts viewer on viewer.vatra_id in (f.requester_id,f.recipient_id)
 where viewer.user_id=(select auth.uid()) and f.status='accepted'
 and ((f.requester_id=author_vatra_id and f.recipient_id=viewer.vatra_id)
 or (f.recipient_id=author_vatra_id and f.requester_id=viewer.vatra_id))
)));
drop policy if exists "closed_profile_media_gate" on public.vatra_profile_media;
create policy "closed_profile_media_gate" on public.vatra_profile_media
 as restrictive for select to authenticated using ((exists (
 select 1 from public.accounts a where a.vatra_id=vatra_id
 and a.user_id=(select auth.uid())
) or coalesce((
 select pref.profile_visibility from public.vatra_profile_preferences pref
 where pref.vatra_id=vatra_id
),'public')='public' or exists (
 select 1 from public.vatra_friendships f
 join public.accounts viewer on viewer.vatra_id in (f.requester_id,f.recipient_id)
 where viewer.user_id=(select auth.uid()) and f.status='accepted'
 and ((f.requester_id=vatra_id and f.recipient_id=viewer.vatra_id)
 or (f.recipient_id=vatra_id and f.requester_id=viewer.vatra_id))
)));
drop policy if exists "closed_profile_presence_gate" on public.profile_presence;
create policy "closed_profile_presence_gate" on public.profile_presence
 as restrictive for select to authenticated using ((exists (
 select 1 from public.accounts a where a.vatra_id=vatra_id
 and a.user_id=(select auth.uid())
) or coalesce((
 select pref.profile_visibility from public.vatra_profile_preferences pref
 where pref.vatra_id=vatra_id
),'public')='public' or exists (
 select 1 from public.vatra_friendships f
 join public.accounts viewer on viewer.vatra_id in (f.requester_id,f.recipient_id)
 where viewer.user_id=(select auth.uid()) and f.status='accepted'
 and ((f.requester_id=vatra_id and f.recipient_id=viewer.vatra_id)
 or (f.recipient_id=vatra_id and f.requester_id=viewer.vatra_id))
)));
