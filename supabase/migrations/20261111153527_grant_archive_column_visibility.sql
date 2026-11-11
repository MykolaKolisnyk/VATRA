-- Feed posts use column-level grants. Archive filters require SELECT
-- on archived_at in addition to owner-only UPDATE and the existing RLS policies.
grant select(archived_at) on public.feed_posts to authenticated;
