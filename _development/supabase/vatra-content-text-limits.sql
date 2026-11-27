-- Prepared for review; do not run before checking the release workflow and current schema.
-- VATRA content text limits. Existing text is never truncated or deleted.
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

alter table public.profile_details
 add constraint vatra_profile_short_bio_length check (field_key <> 'short_bio' or char_length(field_value) <= 101);

-- One existing status is over 50 characters. Retain the original 140-char check
-- for legacy rows; reject new oversized statuses without blocking unrelated updates.
create function public.vatra_enforce_status_text_limit() returns trigger
 language plpgsql security invoker set search_path = '' as $$
begin
 if tg_op = 'UPDATE' then
  if new.status_text is not distinct from old.status_text then return new; end if;
 end if;
 if char_length(new.status_text) > 50 then
  raise exception 'Profile status exceeds 50 characters' using errcode = '23514';
 end if;
 return new;
end;
$$;
revoke all on function public.vatra_enforce_status_text_limit() from public, anon, authenticated;
create trigger vatra_enforce_status_text_limit
 before insert or update of status_text on public.public_profiles
 for each row execute function public.vatra_enforce_status_text_limit();

-- Stories already have the agreed 260-character check. No change.
commit;
