-- Prepared for review; do not run before checking the release workflow and current schema.
-- VATRA content text limits. Trim existing oversized profile text as requested.
-- Apply atomically. Keep all existing media and non-empty content requirements.
begin;
set local lock_timeout = '5s';

alter table public.feed_posts
 drop constraint feed_posts_body_length,
 add constraint feed_posts_body_length check (
  char_length(btrim(body)) <= case
   when is_clip then 2000 when shared_post_id is not null then 5000 else 20000 end
  and (char_length(btrim(body)) >= 1 or media_path is not null
   or (jsonb_typeof(media_items) = 'array' and jsonb_array_length(media_items) > 0)
   or poll is not null)
 );

alter table public.scheduled_feed_posts
 drop constraint scheduled_feed_post_content,
 add constraint scheduled_feed_post_content check (
  char_length(btrim(body)) <= 20000
  and (char_length(btrim(body)) > 0 or jsonb_array_length(media_items) > 0 or poll is not null)
 );

alter table public.community_posts
 drop constraint vatra_community_posts_body_check,
 add constraint vatra_community_posts_body_check check (
  char_length(btrim(body)) <= 20000
  and (char_length(btrim(body)) >= 1 or media_path is not null
   or (jsonb_typeof(media_items) = 'array' and jsonb_array_length(media_items) > 0))
 );

alter table public.post_comments
 drop constraint vatra_post_comments_body_check,
 add constraint vatra_post_comments_body_check check (
  char_length(btrim(body)) between 1 and 2000
  or (char_length(btrim(body)) = 0 and media_kind in ('image','video'))
 );
alter table public.avatar_comments
 drop constraint vatra_avatar_comments_body_check,
 add constraint vatra_avatar_comments_body_check check (char_length(btrim(body)) between 1 and 2000);
alter table public.photo_album_comments
 drop constraint photo_album_comments_body_check,
 add constraint photo_album_comments_body_check check (char_length(btrim(body)) between 1 and 2000);

update public.profile_details set field_value=left(field_value,101)
 where field_key='short_bio' and char_length(field_value)>101;
alter table public.profile_details
 add constraint vatra_profile_short_bio_length check (field_key <> 'short_bio' or char_length(field_value) <= 101);
update public.public_profiles set status_text=left(status_text,50) where char_length(status_text)>50;
alter table public.public_profiles
 drop constraint vatra_public_profiles_status_length,
 add constraint vatra_public_profiles_status_length check (status_text is null or char_length(status_text)<=50);

-- Same row-level access and heartbeat schedule; no raw device identifiers.
alter table public.profile_presence
 add column device_type text check (device_type in ('desktop','mobile'));

-- Stories already have the agreed 260-character check. No change.
commit;
