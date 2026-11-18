alter table public.communities add column category text not null default 'other';
alter table public.communities add constraint communities_category_check check (category in ('music', 'sport', 'travel', 'technology', 'education', 'art', 'gaming', 'business', 'news', 'cooking', 'transport', 'cinema', 'animals', 'photography', 'regions', 'fashion', 'charity', 'science', 'nature', 'books', 'health', 'fitness', 'family', 'home', 'culture', 'history', 'humor', 'shopping', 'finance', 'crafts', 'beauty', 'career', 'events', 'psychology', 'politics', 'military', 'spirituality', 'ai', 'social', 'other'));
create index communities_category_created_idx on public.communities (category, created_at desc, club_id desc);
grant select (category) on public.communities to anon, authenticated;
grant insert (category) on public.communities to authenticated;
notify pgrst, 'reload schema';
