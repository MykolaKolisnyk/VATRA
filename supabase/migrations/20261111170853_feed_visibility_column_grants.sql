-- VATRA uses column-level API grants; new fields need explicit grants.
grant select(visibility),insert(visibility),update(visibility)
 on public.feed_posts to authenticated;
revoke all(visibility) on public.feed_posts from anon;
